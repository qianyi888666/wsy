App({
  onLaunch: function () {
    // 检测设备平台
    this.detectPlatform()
  },
  
  // 检测设备平台
  detectPlatform: function() {
    try {
      const deviceInfo = wx.getDeviceInfo()
      
      // 检测是否为 HarmonyOS
      if (deviceInfo.platform === 'harmony') {
        // 可以在这里添加 HarmonyOS 特定的兼容性处理
        this.globalData.isHarmonyOS = true
      } else {
        this.globalData.isHarmonyOS = false
      }
    } catch (e) {
      this.globalData.isHarmonyOS = false
    }
  },
  
  globalData: {
    userInfo: null,
    apiBaseUrl: 'https://xxxxx.com', // API基础地址，请修改为实际地址
    isHarmonyOS: false // 是否为 HarmonyOS 平台
  }
})