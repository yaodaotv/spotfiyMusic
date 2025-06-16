// src/api/spotify.js

import axios from 'axios';

const CLIENT_ID = 'b05bf40cb14842d9b8b68c58e652d441';
const REDIRECT_URI = 'https://www.237922.xyz/callback'; // This should also include http://localhost:8080/callback for local development

// Function to generate a random string for code_verifier
function generateRandomString(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// Function to generate SHA256 hash
async function generateCodeChallenge(codeVerifier) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
  return base64urlencode(digest);
}

// Function to base64url encode
function base64urlencode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// Function to initiate Spotify login
export async function spotifyLogin() {
  const codeVerifier = generateRandomString(128);
  localStorage.setItem('code_verifier', codeVerifier);

  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const scope = 'user-read-private user-read-email user-library-read user-library-modify playlist-read-private playlist-modify-private playlist-modify-public user-read-playback-state user-modify-playback-state user-read-currently-playing streaming app-remote-control';

  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.append('client_id', CLIENT_ID);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('scope', scope);
  authUrl.searchParams.append('code_challenge_method', 'S256');
  authUrl.searchParams.append('code_challenge', codeChallenge);

  window.location.href = authUrl.toString();
}

// Function to handle Spotify callback and get tokens
export async function getSpotifyTokens(code) {
  const codeVerifier = localStorage.getItem('code_verifier');

  const params = new URLSearchParams();
  params.append('client_id', CLIENT_ID);
  params.append('grant_type', 'authorization_code');
  params.append('code', code);
  params.append('redirect_uri', REDIRECT_URI);
  params.append('code_verifier', codeVerifier);

  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, refresh_token, expires_in } = response.data;
    localStorage.setItem('spotify_access_token', access_token);
    localStorage.setItem('spotify_refresh_token', refresh_token);
    localStorage.setItem('spotify_token_expires_at', Date.now() + expires_in * 1000);
    localStorage.removeItem('code_verifier');
    return true;
  } catch (error) {
    console.error('Error getting Spotify tokens:', error);
    return false;
  }
}

// Function to refresh Spotify access token
export async function refreshSpotifyToken() {
  const refreshToken = localStorage.getItem('spotify_refresh_token');
  if (!refreshToken) {
    console.warn('No refresh token found.');
    return false;
  }

  const params = new URLSearchParams();
  params.append('client_id', CLIENT_ID);
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', refreshToken);

  try {
    const response = await axios.post('https://accounts.spotify.com/api/token', params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, expires_in } = response.data;
    localStorage.setItem('spotify_access_token', access_token);
    localStorage.setItem('spotify_token_expires_at', Date.now() + expires_in * 1000);
    return true;
  } catch (error) {
    console.error('Error refreshing Spotify token:', error);
    return false;
  }
}

// Function to make authenticated Spotify API requests
export async function spotifyApiRequest(method, url, data = {}) {
  let accessToken = localStorage.getItem('spotify_access_token');
  const tokenExpiresAt = localStorage.getItem('spotify_token_expires_at');

  if (!accessToken || Date.now() >= tokenExpiresAt) {
    const refreshed = await refreshSpotifyToken();
    if (!refreshed) {
      console.error('Failed to refresh token. User needs to re-authenticate.');
      // Optionally redirect to login page
      return null;
    }
    accessToken = localStorage.getItem('spotify_access_token');
  }

  try {
    const config = {
      method: method,
      url: `https://api.spotify.com/v1${url}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      data: data,
    };
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error('Spotify API request failed:', error);
    return null;
  }
}

// Example API calls (will be used later)
export async function getMyProfile() {
  return spotifyApiRequest('get', '/me');
}

export async function searchSpotify(query, type = 'track') {
  return spotifyApiRequest('get', `/search?q=${encodeURIComponent(query)}&type=${type}`);
}

export async function getTrack(id) {
  return spotifyApiRequest('get', `/tracks/${id}`);
}

export async function getAlbum(id) {
  return spotifyApiRequest('get', `/albums/${id}`);
}

export async function getArtist(id) {
  return spotifyApiRequest('get', `/artists/${id}`);
}

export async function getArtistTopTracks(id) {
  return spotifyApiRequest('get', `/artists/${id}/top-tracks?market=from_token`);
}

export async function getArtistAlbums(id) {
  return spotifyApiRequest('get', `/artists/${id}/albums`);
}

export async function getPlaylist(id) {
  return spotifyApiRequest('get', `/playlists/${id}`);
}

export async function getPlaylistTracks(id) {
  return spotifyApiRequest('get', `/playlists/${id}/tracks`);
}

export async function getMyPlaylists() {
  return spotifyApiRequest('get', '/me/playlists');
}

export async function getMySavedTracks() {
  return spotifyApiRequest('get', '/me/tracks');
}

export async function getMyTopArtists(time_range = 'medium_term', limit = 5) {
  return spotifyApiRequest('get', `/me/top/artists?time_range=${time_range}&limit=${limit}`);
}

export async function getMyTopTracks(time_range = 'medium_term', limit = 5) {
  return spotifyApiRequest('get', `/me/top/tracks?time_range=${time_range}&limit=${limit}`);
}


