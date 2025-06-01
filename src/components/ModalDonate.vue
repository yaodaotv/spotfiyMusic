<template>
  <div v-show="show" class="modal" @click.self="close">
    <div class="modal-content">
      <div class="modal-header">
        <h2>打赏作者</h2>
        <button-icon icon="x" @click.native="close" />
      </div>
      <div class="modal-body">
        <div class="donate-container">
          <div class="donate-item">
            <img :src="wechatQRCode" alt="微信支付" />
            <p>微信</p>
          </div>
          <div class="donate-item">
            <img :src="alipayQRCode" alt="支付宝" />
            <p>支付宝</p>
          </div>
        </div>
        <div class="donate-message">
          <p>感谢您的支持，这将帮助我们做得更好！</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ButtonIcon from '@/components/ButtonIcon.vue';

export default {
  name: 'ModalDonate',
  components: {
    ButtonIcon,
  },
  data() {
    return {
      wechatQRCode:
        'https://5f4480c.webp.li/2025/04/83427cf17e1bf1874c5e391df35f1c9a.png',
      alipayQRCode:
        'https://5f4480c.webp.li/2025/04/3046cde05fab442e147234ec503ea9ee.png',
    };
  },
  computed: {
    show() {
      return this.$store.state.showDonateModal;
    },
  },
  methods: {
    close() {
      this.$store.commit('toggleDonateModal', false);
    },
  },
};
</script>

<style lang="scss" scoped>
.modal {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 200;
  backdrop-filter: blur(10px);
}

.modal-content {
  background: var(--color-body-bg);
  border-radius: 12px;
  width: 500px;
  max-width: 90vw;
  box-shadow: 0 20px 30px rgba(0, 0, 0, 0.28);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  h2 {
    font-size: 20px;
    font-weight: 600;
    margin: 0;
  }
}

.modal-body {
  padding: 24px;
}

.donate-container {
  display: flex;
  justify-content: space-around;
  margin-bottom: 20px;
}

.donate-item {
  text-align: center;
  img {
    width: 180px;
    height: 180px;
    border-radius: 4px;
    margin-bottom: 10px;
  }
  p {
    font-size: 16px;
    font-weight: 500;
    margin: 0;
  }
}

.donate-message {
  text-align: center;
  margin-top: 20px;
  p {
    font-size: 14px;
    color: rgba(0, 0, 0, 0.68);
  }
}

@media (max-width: 768px) {
  .donate-container {
    flex-direction: column;
    align-items: center;
  }
  .donate-item {
    margin-bottom: 20px;
  }
}
</style>
