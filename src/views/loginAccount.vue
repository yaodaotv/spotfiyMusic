<template>
  <div class="login">
    <div class="login-container">
      <div class="section-1">
        <img src="/img/logos/spotify.png" alt="Spotify Logo" />
      </div>
      <div class="title">{{ $t("login.loginText") }}</div>
      <div class="section-2">
        <button @click="spotifyLogin" class="spotify-login-button">
          使用 Spotify 登录
        </button>
      </div>
      <div class="notice">
        <p>请注意：此应用为第三方音乐播放器，并非 Spotify 官方应用。</p>
        <p>您需要拥有 Spotify Premium 账户才能使用完整的播放功能。</p>
      </div>
    </div>
  </div>
</template>

<script>
import { spotifyLogin, getSpotifyTokens } from "@/api/spotify";
import { mapMutations } from "vuex";
import nativeAlert from "@/utils/nativeAlert";

export default {
  name: "Login",
  data() {
    return {
      processing: false,
    };
  },
  methods: {
    ...mapMutions(["updateData"]),
    spotifyLogin() {
      this.processing = true;
      spotifyLogin();
    },
    async handleSpotifyCallback() {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");

      if (code) {
        this.processing = true;
        const success = await getSpotifyTokens(code);
        if (success) {
          this.updateData({ key: "loginMode", value: "spotify" });
          this.$store.dispatch("fetchUserProfile").then(() => {
            this.$router.push({ path: "/library" });
          });
        } else {
          nativeAlert("Spotify 登录失败，请重试。");
          this.processing = false;
        }
      } else if (urlParams.get("error")) {
        nativeAlert("Spotify 授权被拒绝。");
        this.processing = false;
      }
    },
  },
  created() {
    // Check if it's a Spotify callback
    if (window.location.pathname === "/callback") {
      this.handleSpotifyCallback();
    }
  },
};
</script>

<style lang="scss" scoped>
.login {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-top: 32px;
}

.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.title {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 48px;
  color: var(--color-text);
}

.section-1 {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  img {
    height: 64px;
    margin: 20px;
    user-select: none;
  }
}

.spotify-login-button {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 600;
  background-color: #1db954; /* Spotify Green */
  color: white;
  border-radius: 8px;
  margin-top: 24px;
  transition: 0.2s;
  padding: 8px;
  width: 300px;
  border: none;
  cursor: pointer;
  &:hover {
    transform: scale(1.06);
  }
  &:active {
    transform: scale(0.94);
  }
}

.notice {
  width: 300px;
  border-top: 1px solid rgba(128, 128, 128);
  margin-top: 48px;
  padding-top: 12px;
  font-size: 12px;
  color: var(--color-text);
  opacity: 0.48;
}
</style>


