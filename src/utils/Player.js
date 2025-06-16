import store from '@/store';
import { isAccountLoggedIn } from '@/utils/auth';
import { isCreateMpris, isCreateTray } from '@/utils/platform';
import shuffle from 'lodash/shuffle';

// ADD Spotify API imports
import { spotifyApiRequest, refreshSpotifyToken } from '@/api/spotify';

const PLAY_PAUSE_FADE_DURATION = 200;

const INDEX_IN_PLAY_NEXT = -1;

/**
 * @readonly
 * @enum {string}
 */
const UNPLAYABLE_CONDITION = {
  PLAY_NEXT_TRACK: 'playNextTrack',
  PLAY_PREV_TRACK: 'playPrevTrack',
};

const electron =
  process.env.IS_ELECTRON === true ? window.require('electron') : null;
const ipcRenderer =
  process.env.IS_ELECTRON === true ? electron.ipcRenderer : null;
const delay = ms =>
  new Promise(resolve => {
    setTimeout(() => {
      resolve('');
    }, ms);
  });
const excludeSaveKeys = [
  '_playing',
  '_personalFMLoading',
  '_personalFMNextLoading',
];

function setTitle(track) {
  document.title = track
    ? `${track.name} · ${track.ar[0].name} - YesPlayMusic`
    : 'YesPlayMusic';
  if (isCreateTray) {
    ipcRenderer?.send('updateTrayTooltip', document.title);
  }
  store.commit('updateTitle', document.title);
}

function setTrayLikeState(isLiked) {
  if (isCreateTray) {
    ipcRenderer?.send('updateTrayLikeState', isLiked);
  }
}

export default class {
  constructor() {
    // 播放器状态
    this._playing = false; // 是否正在播放中
    this._progress = 0; // 当前播放歌曲的进度
    this._enabled = false; // 是否启用Player
    this._repeatMode = 'off'; // off | on | one
    this._shuffle = false; // true | false
    this._reversed = false;
    this._volume = 1; // 0 to 1
    this._volumeBeforeMuted = 1; // 用于保存静音前的音量
    this._personalFMLoading = false; // 是否正在私人FM中加载新的track
    this._personalFMNextLoading = false; // 是否正在缓存私人FM的下一首歌曲

    // 播放信息
    this._list = []; // 播放列表
    this._current = 0; // 当前播放歌曲在播放列表里的index
    this._shuffledList = []; // 被随机打乱的播放列表，随机播放模式下会使用此播放列表
    this._shuffledCurrent = 0; // 当前播放歌曲在随机列表里面的index
    this._playlistSource = { type: 'album', id: 123 }; // 当前播放列表的信息
    this._currentTrack = { id: 86827685 }; // 当前播放歌曲的详细信息
    this._playNextList = []; // 当这个list不为空时，会优先播放这个list的歌
    this._isPersonalFM = false; // 是否是私人FM模式
    this._personalFMTrack = { id: 0 }; // 私人FM当前歌曲
    this._personalFMNextTrack = {
      id: 0,
    }; // 私人FM下一首歌曲信息（为了快速加载下一首）

    /**
     * The blob records for cleanup.
     *
     * @private
     * @type {string[]}
     */
    this.createdBlobRecords = [];

    // Spotify Web Playback SDK player instance
    this._spotifyPlayer = null; // ADD THIS

    // init
    this._init();

    window.yesplaymusic = {};
    window.yesplaymusic.player = this;
  }

  get repeatMode() {
    return this._repeatMode;
  }
  set repeatMode(mode) {
    if (this._isPersonalFM) return;
    if (!['off', 'on', 'one'].includes(mode)) {
      console.warn("repeatMode: invalid args, must be 'on' | 'off' | 'one'");
      return;
    }
    this._repeatMode = mode;
  }
  get shuffle() {
    return this._shuffle;
  }
  set shuffle(shuffle) {
    if (this._isPersonalFM) return;
    if (shuffle !== true && shuffle !== false) {
      console.warn('shuffle: invalid args, must be Boolean');
      return;
    }
    this._shuffle = shuffle;
    if (shuffle) {
      this._shuffleTheList();
    }
    // 同步当前歌曲在列表中的下标
    this.current = this.list.indexOf(this.currentTrackID);
  }
  get reversed() {
    return this._reversed;
  }
  set reversed(reversed) {
    if (this._isPersonalFM) return;
    if (reversed !== true && reversed !== false) {
      console.warn('reversed: invalid args, must be Boolean');
      return;
    }
    console.log('changing reversed to:', reversed);
    this._reversed = reversed;
  }
  get volume() {
    return this._volume;
  }
  set volume(volume) {
    this._volume = volume;
    if (this._spotifyPlayer) {
      this._spotifyPlayer.setVolume(volume).then(() => {
        console.log(`Volume set to ${volume}`);
      }).catch(error => {
        console.error('Error setting volume:', error);
      });
    }
  }
  get list() {
    return this.shuffle ? this._shuffledList : this._list;
  }
  set list(list) {
    this._list = list;
  }
  get current() {
    return this.shuffle ? this._shuffledCurrent : this._current;
  }
  set current(current) {
    if (this.shuffle) {
      this._shuffledCurrent = current;
    } else {
      this._current = current;
    }
  }
  get enabled() {
    return this._enabled;
  }
  get playing() {
    return this._playing;
  }
  get currentTrack() {
    return this._currentTrack;
  }
  get currentTrackID() {
    return this._currentTrack?.id ?? 0;
  }
  get playlistSource() {
    return this._playlistSource;
  }
  get playNextList() {
    return this._playNextList;
  }
  get isPersonalFM() {
    return this._isPersonalFM;
  }
  get personalFMTrack() {
    return this._personalFMTrack;
  }
  get currentTrackDuration() {
    const trackDuration = this._currentTrack.dt || 1000;
    let duration = ~~(trackDuration / 1000);
    return duration > 1 ? duration - 1 : duration;
  }
  get progress() {
    return this._progress;
  }
  set progress(value) {
    if (this._spotifyPlayer) {
      this._spotifyPlayer.seek(value * 1000).then(() => {
        console.log(`Seeked to ${value} seconds!`);
      }).catch(error => {
        console.error('Error seeking:', error);
      });
    }
  }
  get isCurrentTrackLiked() {
    return store.state.liked.songs.includes(this.currentTrack.id);
  }

  _init() {
    this._loadSelfFromLocalStorage();

    // Initialize Spotify Web Playback SDK
    this._initSpotifyPlaybackSDK();

    if (this._enabled) {
      this._initMediaSession();
    }

    this._setIntervals();

    // 初始化私人FM
    // This part will need to be adapted or removed if personal FM is not supported by Spotify API
    // For now, keeping it as is, but it will likely break without Netease API
    // personalFM().then(result => {
    //   this._personalFMTrack = result.data[0];
    //   this._personalFMNextTrack = result.data[1];
    //   return this._personalFMTrack;
    // });
  }

  _initSpotifyPlaybackSDK() {
    // Check if Spotify SDK is loaded
    if (window.Spotify) {
      this._spotifyPlayer = new window.Spotify.Player({
        name: 'YesPlayMusic',
        getOAuthToken: async cb => {
          // Get access token from localStorage or refresh it
          let accessToken = localStorage.getItem('spotify_access_token');
          const tokenExpiresAt = localStorage.getItem('spotify_token_expires_at');

          if (!accessToken || Date.now() >= tokenExpiresAt) {
            const refreshed = await refreshSpotifyToken();
            if (refreshed) {
              accessToken = localStorage.getItem('spotify_access_token');
            } else {
              console.error('Failed to refresh Spotify token for Web Playback SDK.');
              // Redirect to login or show error
              return;
            }
          }
          cb(accessToken);
        },
        volume: this.volume,
      });

      // Ready
      this._spotifyPlayer.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        store.commit('updateData', { key: 'spotifyDeviceId', value: device_id });
        // Transfer playback to this device
        // spotifyApiRequest('put', '/me/player', {
        //   device_ids: [device_id],
        //   play: false, // Don't start playback immediately
        // });
      });

      // Not Ready
      this._spotifyPlayer.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
      });

      // Player State Changed
      this._spotifyPlayer.addListener('player_state_changed', state => {
        if (!state) return;
        this._setPlaying(!state.paused);
        this._progress = state.position / 1000; // Convert ms to seconds
        // Update current track info based on Spotify state
        if (state.track_window.current_track) {
          const spotifyTrack = state.track_window.current_track;
          // Map Spotify track to YesPlayMusic track format
          this._currentTrack = this._mapSpotifyTrackToYesPlayMusicTrack(spotifyTrack);
          setTitle(this._currentTrack);
          setTrayLikeState(store.state.liked.songs.includes(this.currentTrack.id));
        }
      });

      // Error handling
      this._spotifyPlayer.addListener('initialization_error', ({ message }) => {
        console.error('Failed to initialize Spotify Web Playback SDK:', message);
      });
      this._spotifyPlayer.addListener('authentication_error', ({ message }) => {
        console.error('Spotify Web Playback SDK authentication error:', message);
        // Token expired, need to re-authenticate
        store.dispatch('showToast', 'Spotify 认证过期，请重新登录。');
        // Optionally redirect to login page
      });
      this._spotifyPlayer.addListener('account_error', ({ message }) => {
        console.error('Spotify Web Playback SDK account error:', message);
        store.dispatch('showToast', '您的 Spotify 账户无法使用 Web Playback SDK，可能需要 Premium 账户。');
      });
      this._spotifyPlayer.addListener('playback_error', ({ message }) => {
        console.error('Spotify Web Playback SDK playback error:', message);
      });

      this._spotifyPlayer.connect();
    } else {
      console.warn('Spotify Web Playback SDK not loaded. Make sure to include the script tag.');
      // Fallback or inform user
    }
  }

  // Helper to map Spotify track object to YesPlayMusic track object
  _mapSpotifyTrackToYesPlayMusicTrack(spotifyTrack) {
    return {
      id: spotifyTrack.id,
      name: spotifyTrack.name,
      ar: spotifyTrack.artists.map(artist => ({ id: artist.id, name: artist.name })),
      al: { id: spotifyTrack.album.id, name: spotifyTrack.album.name, picUrl: spotifyTrack.album.images[0]?.url },
      dt: spotifyTrack.duration_ms, // duration in ms
      // Add other properties as needed for YesPlayMusic's UI
    };
  }

  _setPlaying(isPlaying) {
    this._playing = isPlaying;
    if (isCreateTray) {
      ipcRenderer?.send('updateTrayPlayState', this._playing);
    }
  }
  _setIntervals() {
    // 同步播放进度
    // TODO: 如果 _progress 在别的地方被改变了，
    // 这个定时器会覆盖之前改变的值，是bug
    setInterval(() => {
      // Spotify SDK handles progress updates via 'player_state_changed' listener
    }, 1000);
  }
  _getNextTrack() {
    const next = this._reversed ? this.current - 1 : this.current + 1;

    if (this._playNextList.length > 0) {
      let trackID = this._playNextList[0];
      return [trackID, INDEX_IN_PLAY_NEXT];
    }

    // 循环模式开启，则重新播放当前模式下的相对的下一首
    if (this.repeatMode === 'on') {
      if (this._reversed && this.current === 0) {
        // 倒序模式，当前歌曲是第一首，则重新播放列表最后一首
        return [this.list[this.list.length - 1], this.list.length - 1];
      } else if (this.list.length === this.current + 1) {
        // 正序模式，当前歌曲是最后一首，则重新播放第一首
        return [this.list[0], 0];
      }
    }

    // 返回 [trackID, index]
    return [this.list[next], next];
  }
  _getPrevTrack() {
    const next = this._reversed ? this.current + 1 : this.current - 1;

    // 循环模式开启，则重新播放当前模式下的相对的下一首
    if (this.repeatMode === 'on') {
      if (this._reversed && this.current === 0) {
        // 倒序模式，当前歌曲是最后一首，则重新播放列表第一首
        return [this.list[0], 0];
      } else if (this.list.length === this.current + 1) {
        // 正序模式，当前歌曲是第一首，则重新播放列表最后一首
        return [this.list[this.list.length - 1], this.list.length - 1];
      }
    }

    // 返回 [trackID, index]
    return [this.list[next], next];
  }
  async _shuffleTheList(firstTrackID = this.currentTrackID) {
    let list = this._list.filter(tid => tid !== firstTrackID);
    if (firstTrackID === 'first') list = this._list;
    this._shuffledList = shuffle(list);
    if (firstTrackID !== 'first') this._shuffledList.unshift(firstTrackID);
  }
  async _scrobble(track, time, completed = false) {
    console.debug(
      `[debug][Player.js] scrobble track 👉 ${track.name} by ${track.ar[0].name} 👉 time:${time} completed: ${completed}`
    );
    const trackDuration = ~~(track.dt / 1000);
    time = completed ? trackDuration : ~~time;
    // scrobble({ // This is Netease scrobble, will need to be replaced or removed
    //   id: track.id,
    //   sourceid: this.playlistSource.id,
    //   time,
    // });
    // Last.fm scrobble might still be relevant if user uses it
    // if (
    //   store.state.lastfm.key !== undefined &&
    //   (time >= trackDuration / 2 || time >= 240)
    // ) {
    //   const timestamp = ~~(new Date().getTime() / 1000) - time;
    //   trackScrobble({
    //     artist: track.ar[0].name,
    //     track: track.name,
    //     timestamp,
    //     album: track.al.name,
    //     trackNumber: track.no,
    //     duration: trackDuration,
    //   });
    // }
  }

  async _playAudioSource(source, autoplay = true) {
    // 'source' here would be a Spotify track URI (e.g., 'spotify:track:...')
    // or a track ID
    const deviceId = store.state.spotifyDeviceId;
    if (!deviceId) {
      console.error('Spotify device ID not available.');
      store.dispatch('showToast', 'Spotify 播放器未准备好，请稍候或刷新页面。');
      return;
    }

    try {
      // If source is a track ID, convert to URI
      let trackUri = source.startsWith('spotify:track:') ? source : `spotify:track:${source}`;

      await spotifyApiRequest('put', `/me/player/play?device_id=${deviceId}`, {
        uris: [trackUri],
      });

      if (autoplay) {
        this.play(); // This will call _spotifyPlayer.resume()
        // Update title and like state after playback starts
        // The player_state_changed listener will handle this
      }
    } catch (error) {
      console.error('Error playing Spotify track:', error);
      store.dispatch('showToast', '无法播放 Spotify 歌曲，请检查您的网络或 Spotify Premium 账户。');
    }
  }

  async _getAudioSource(track) {
    // For Spotify, we don't get a direct audio source URL.
    // We just need the track ID to tell the Spotify player to play it.
    return track.id; // Return the Spotify track ID
  }

  async _replaceCurrentTrack(
    id,
    autoplay = true,
    ifUnplayableThen = UNPLAYABLE_CONDITION.PLAY_NEXT_TRACK
  ) {
    if (autoplay && this._currentTrack.name) {
      this._scrobble(this.currentTrack, this._spotifyPlayer?.position / 1000); // Use spotifyPlayer.position
    }

    // Fetch track details from Spotify API
    try {
      const spotifyTrack = await spotifyApiRequest('get', `/tracks/${id}`);
      if (!spotifyTrack) {
        throw new Error('Track not found on Spotify.');
      }

      this._currentTrack = this._mapSpotifyTrackToYesPlayMusicTrack(spotifyTrack);
      this._updateMediaSessionMetaData(this._currentTrack);

      return this._replaceCurrentTrackAudio(
        this._currentTrack,
        autoplay,
        true,
        ifUnplayableThen
      );
    } catch (error) {
      console.error('Error fetching Spotify track details:', error);
      store.dispatch('showToast', `无法获取歌曲信息: ${error.message}`);
      switch (ifUnplayableThen) {
        case UNPLAYABLE_CONDITION.PLAY_NEXT_TRACK:
          this._playNextTrack(this.isPersonalFM);
          break;
        case UNPLAYABLE_CONDITION.PLAY_PREV_TRACK:
          this.playPrevTrack();
          break;
        default:
          store.dispatch(
            'showToast',
            `undefined Unplayable condition: ${ifUnplayableThen}`
          );
          break;
      }
      return false;
    }
  }

  async _replaceCurrentTrackAudio(
    track,
    autoplay,
    isCacheNextTrack,
    ifUnplayableThen = UNPLAYABLE_CONDITION.PLAY_NEXT_TRACK
  ) {
    const trackId = await this._getAudioSource(track);

    if (trackId) {
      let replaced = false;
      if (track.id === this.currentTrackID) {
        await this._playAudioSource(trackId, autoplay);
        replaced = true;
      }
      return replaced;
    } else {
      store.dispatch('showToast', `无法播放 ${track.name}`);
      switch (ifUnplayableThen) {
        case UNPLAYABLE_CONDITION.PLAY_NEXT_TRACK:
          this._playNextTrack(this.isPersonalFM);
          break;
        case UNPLAYABLE_CONDITION.PLAY_PREV_TRACK:
          this.playPrevTrack();
          break;
        default:
          store.dispatch(
            'showToast',
            `undefined Unplayable condition: ${ifUnplayableThen}`
          );
          break;
      }
      return false;
    }
  }
  _cacheNextTrack() {
    let nextTrackID = this._isPersonalFM
      ? this._personalFMNextTrack?.id ?? 0
      : this._getNextTrack()[0];
    if (!nextTrackID) return;
  }

  play() {
    if (this._spotifyPlayer) {
      this._spotifyPlayer.resume().then(() => {
        console.log('Playback resumed!');
        this._setPlaying(true);
      }).catch(error => {
        console.error('Error resuming playback:', error);
        store.dispatch('showToast', '无法恢复播放，请检查您的 Spotify Premium 账户。');
      });
    }
  }

  pause() {
    if (this._spotifyPlayer) {
      this._spotifyPlayer.pause().then(() => {
        console.log('Playback paused!');
        this._setPlaying(false);
      }).catch(error => {
        console.error('Error pausing playback:', error);
      });
    }
  }

  nextTrack() {
    if (this._spotifyPlayer) {
      this._spotifyPlayer.nextTrack().then(() => {
        console.log('Skipped to next track!');
      }).catch(error => {
        console.error('Error skipping to next track:', error);
      });
    }
  }

  playPrevTrack() {
    if (this._spotifyPlayer) {
      this._spotifyPlayer.previousTrack().then(() => {
        console.log('Skipped to previous track!');
      }).catch(error => {
        console.error('Error skipping to previous track:', error);
      });
    }
  }

  setOutputDevice() {
    // Spotify Web Playback SDK handles device internally.
    // If user wants to transfer playback to another device,
    // they can do it via Spotify's own UI or by calling Spotify API's transfer playback endpoint.
    // For now, we'll assume playback stays on the current device.
  }

  _nextTrackCallback() {
    if (this.repeatMode === 'one') {
      this._spotifyPlayer.seek(0).then(() => {
        this.play();
      });
    } else {
      this.nextTrack();
    }
  }

  // Remaining methods (playTrack, playAlbum, playPlaylist, etc.) will need to be adapted
  // to use Spotify API calls and then trigger playback via _playAudioSource.
  // This will be handled in subsequent steps.

  // Placeholder for _loadSelfFromLocalStorage - assuming it loads basic player state
  _loadSelfFromLocalStorage() {
    // Implement loading player state from localStorage if needed
  }

  // Placeholder for _updateMediaSessionMetaData - assuming it updates browser media controls
  _updateMediaSessionMetaData(track) {
    // Implement updating Media Session API with Spotify track info
  }

  // Placeholder for personalFM - will need to be removed or replaced if not supported by Spotify
  // personalFM() {
  //   return Promise.resolve({ data: [] }); // Dummy implementation
  // }
}


