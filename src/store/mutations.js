// 修改store/mutations.js，添加toggleDonateModal方法

import shortcuts from '@/utils/shortcuts';
import { updateShortcut } from '@/utils/shortcuts';
import cloneDeep from 'lodash/cloneDeep';

export default {
  updateLikedSongs(state, trackIDs) {
    state.liked.songs = trackIDs;
  },
  updateLikedSongsWithDetails(state, tracks) {
    state.liked.songsWithDetails = tracks;
  },
  updateLikedPlaylists(state, playlists) {
    state.liked.playlists = playlists;
  },
  updateLikedAlbums(state, albums) {
    state.liked.albums = albums;
  },
  updateLikedArtists(state, artists) {
    state.liked.artists = artists;
  },
  updateLikedMVs(state, mvs) {
    state.liked.mvs = mvs;
  },
  updateLastfm(state, session) {
    state.lastfm = session;
  },
  updateUserProfile(state, userProfile) {
    state.settings.user = userProfile;
  },
  updateUserPlaylist(state, { playlists }) {
    state.settings.user.playlists = playlists;
  },
  updateCloudDisk(state, cloud) {
    state.settings.user.cloud = cloud;
  },
  updateSettings(state, { key, value }) {
    state.settings[key] = value;
  },
  updateData(state, { key, value }) {
    state.data[key] = value;
  },
  togglePlaylistCategory(state, name) {
    const index = state.settings.playlistCategories.indexOf(name);
    if (index === -1) {
      state.settings.playlistCategories.push(name);
    } else {
      state.settings.playlistCategories = 
        state.settings.playlistCategories.filter(c => c !== name);
    }
  },
  updateToast(state, toast) {
    state.toast = toast;
  },
  updateModal(state, { modalName, key, value }) {
    state.modals[modalName][key] = value;
  },
  toggleLyrics(state) {
    state.showLyrics = !state.showLyrics;
  },
  updateDailyTracks(state, dailyTracks) {
    state.dailyTracks = dailyTracks;
  },
  updateShortcut(state, { id, shortcut }) {
    const newShortcut = updateShortcut(state.settings.shortcuts, id, shortcut);
    state.settings.shortcuts = newShortcut;
  },
  restoreDefaultShortcuts(state) {
    state.settings.shortcuts = cloneDeep(shortcuts);
  },
  updatePlayer(state, options) {
    Object.keys(options).forEach(key => {
      state.player[key] = options[key];
    });
  },
  updateCurrentTrack(state, track) {
    state.player.currentTrack = track;
  },
  updatePlayerList(state, list) {
    state.player.list = list;
  },
  updatePlayerFMTrack(state, track) {
    state.player.fmTrack = track;
  },
  updatePlayerFMList(state, list) {
    state.player.fmList = list;
  },
  updatePlaylistSource(state, source) {
    state.player.playlistSource = source;
  },
  updateRepeatMode(state, mode) {
    state.player.repeatMode = mode;
  },
  updatePlayerShuffle(state, shuffle) {
    state.player.shuffle = shuffle;
  },
  updatePlayerRepeat(state, repeat) {
    state.player.repeat = repeat;
  },
  updatePlayerMute(state, mute) {
    state.player.mute = mute;
  },
  updatePlayerVolume(state, volume) {
    state.player.volume = volume;
  },
  updatePlayDetail(state, payload) {
    state.playDetail = payload;
  },
  updateMusicFocus(state, focus) {
    state.musicFocus = focus;
  },
  updateSearching(state, searching) {
    state.enableScrolling = !searching;
  },
  updateTitle(state, title) {
    state.title = title;
  },
  updateSelectTrackIndex(state, index) {
    state.selectTrackIndex = index;
  },
  updateEnableScrolling(state, status) {
    state.enableScrolling = status;
  },
  // 添加打赏模态框的状态切换方法
  toggleDonateModal(state, show) {
    state.showDonateModal = show;
  },
};
