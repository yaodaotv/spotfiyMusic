<template>
  <div id="donateModal" class="donate-modal" @click.self="closeDonateModal">
    <div class="donate-container">
      <div class="donate-title">感谢你赞助予我前进的力量</div>
      <div class="donate-qrcodes">
        <div class="donate-qrcode">
          <img class="qrcode-img" src="@/assets/img/donate/donate_qrcode.png" alt="微信" />
          <div class="qrcode-label">微信</div>
        </div>
        <div class="donate-qrcode">
          <img class="qrcode-img" src="@/assets/img/donate/donate_qrcode.png" alt="支付宝" />
          <div class="qrcode-label">支付宝</div>
        </div>
      </div>
      <div class="donate-subtitle">赞赏者名单</div>
      <div class="donate-subtitle">因为你们的支持让我意识到写文章的价值🙏</div>
      <button id="donateCloseBtn" class="donate-close" @click="closeDonateModal">关闭</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DonateModal',
  methods: {
    openDonateModal() {
      const donateModal = document.getElementById('donateModal');
      if (donateModal) {
        // 确保弹窗可见
        donateModal.style.display = 'flex';
        // 短暂延迟添加动画类，确保display生效
        setTimeout(() => {
          donateModal.classList.remove('hide');
          donateModal.classList.add('show');
          // 阻止背景滚动
          document.body.style.overflow = 'hidden';
        }, 10);
      }
    },
    closeDonateModal() {
      const donateModal = document.getElementById('donateModal');
      if (donateModal) {
        donateModal.classList.remove('show');
        donateModal.classList.add('hide');
        // 延迟后隐藏弹窗并恢复背景滚动
        setTimeout(() => {
          donateModal.classList.remove('hide');
          donateModal.style.display = 'none';
          document.body.style.overflow = '';
        }, 300);
      }
    }
  }
};
</script>

<style>
@import '@/assets/css/donate.css';
</style>
