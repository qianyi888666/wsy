App({
  onLaunch: function () {
    this.detectPlatform()
    this.checkLoginStatus()
  },
  
  detectPlatform: function() {
    try {
      const deviceInfo = wx.getDeviceInfo()
      
      if (deviceInfo.platform === 'harmony') {
        this.globalData.isHarmonyOS = true
      } else {
        this.globalData.isHarmonyOS = false
      }
    } catch (e) {
      this.globalData.isHarmonyOS = false
    }
  },
  
  checkLoginStatus: function() {
    const isLoggedIn = wx.getStorageSync('isLoggedIn')
    const userInfo = wx.getStorageSync('userInfo')
    
    if (isLoggedIn && userInfo) {
      this.globalData.userInfo = userInfo
      this.globalData.isLoggedIn = true
    } else {
      this.globalData.userInfo = null
      this.globalData.isLoggedIn = false
    }
  },
  
  globalData: {
    userInfo: null,
    isLoggedIn: false,
    openid: null,
    apiBaseUrl: 'https://xxxxxx.com',
    isHarmonyOS: false,
    pointsInfo: {
      balance: 0,
      defaultParseLimit: 3,
      freeParseUsed: 0,
      dailyLimit: 10,
      todayWatched: 0
    }
  }
})
