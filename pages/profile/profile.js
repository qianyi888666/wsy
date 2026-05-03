/**
 * @fileoverview 个人中心页面逻辑
 * @description 处理用户信息展示、功能菜单交互、预留接口点击事件
 * @author 芊艺
 * @version 1.0.0
 */

const auth = require('../../utils/auth.js')
const api = require('../../utils/api.js')

Page({
  data: {
    userInfo: {
      avatar: '/images/default-avatar.png',
      nickname: '用户',
      userId: '---'
    },
    pointsInfo: {
      balance: 0
    },
    isLoggedIn: false,
    loginStep: 'start',
    tempAvatarUrl: '',
    tempNickname: '',
    quickEntries: [],
    menuList: [
      { id: 'vip', name: '会员中心', icon: '🎫', path: '', enabled: false },
      { id: 'service', name: '联系客服', icon: '📞', path: '', enabled: true },
      { id: 'tutorial', name: '使用教程', icon: '📖', path: '', enabled: true },
      { id: 'about', name: '关于我们', icon: 'ℹ️', path: '', enabled: true }
    ],
    showAboutModal: false,
    versionInfo: {
      version: '',
      versionIntro: ''
    },
    currentYear: new Date().getFullYear(),
    _pageAlive: true
  },

  safeSetData: function(data, callback) {
    if (!this.data._pageAlive) {
      return;
    }
    try {
      this.setData(data);
      if (callback) {
        callback();
      }
    } catch (e) {
    }
  },

  onLoad: function() {
    this.checkLoginStatus()
    this.getVersionInfo()
  },

  getVersionInfo: function() {
    this.fetchVersionInfo()
  },

  fetchVersionInfo: function() {
    api.getVersionInfo().then(data => {
      this.safeSetData({
        'versionInfo.version': data.version_number || 'v1.0.0',
        'versionInfo.versionIntro': data.version_intro || '首次发布'
      })
      
      wx.setStorageSync('versionInfo', {
        version_number: data.version_number,
        version_intro: data.version_intro
      })
    }).catch(err => {
      const cached = wx.getStorageSync('versionInfo')
      if (cached) {
        this.safeSetData({
          'versionInfo.version': cached.version_number || 'v1.0.0',
          'versionInfo.versionIntro': cached.version_intro || '首次发布'
        })
      } else {
        this.safeSetData({
          'versionInfo.version': 'v1.0.0',
          'versionInfo.versionIntro': '首次发布'
        })
      }
    })
  },

  onShow: function() {
    if (!this.data._pageAlive) {
      return;
    }
    const auth = require('../../utils/auth.js')
    auth.checkTokenExpiry()
    this.checkLoginStatus()
  },

  onPullDownRefresh: function() {
    this.checkLoginStatus()
    this.loadPointsInfo()
    setTimeout(() => {
      wx.stopPullDownRefresh()
    }, 500)
  },

  onUnload: function() {
    this.data._pageAlive = false
  },

  checkLoginStatus: function() {
    if (!this.data._pageAlive) {
      return;
    }
    const isLoggedIn = auth.checkLoginStatus()
    const storedUserInfo = auth.getStoredUserInfo()

    if (isLoggedIn && storedUserInfo && storedUserInfo.openid) {
      api.getUserInfo(storedUserInfo.openid)
        .then((res) => {
          if (!this.data._pageAlive) {
            return;
          }
          if (res.success && res.data) {
            const latestUserInfo = res.data
            const updatedUserInfo = {
              ...storedUserInfo,
              nickname: latestUserInfo.nickname || storedUserInfo.nickname || '用户',
              nickName: latestUserInfo.nickname || storedUserInfo.nickName || '用户',
              avatar: latestUserInfo.avatar_url || storedUserInfo.avatar || storedUserInfo.avatarUrl || '/images/default-avatar.png',
              avatarUrl: latestUserInfo.avatar_url || storedUserInfo.avatarUrl || storedUserInfo.avatar || '/images/default-avatar.png'
            }
            wx.setStorageSync('userInfo', updatedUserInfo)
            this.safeSetData({
              isLoggedIn: true,
              loginStep: 'start',
              userInfo: {
                avatar: updatedUserInfo.avatarUrl || updatedUserInfo.avatar || '/images/default-avatar.png',
                nickname: updatedUserInfo.nickName || updatedUserInfo.nickname || '用户',
                userId: updatedUserInfo.userId || '---',
                userToken: updatedUserInfo.userToken || updatedUserInfo.userId || '---'
              }
            }, () => {
              this.loadPointsInfo();
            });
          } else {
            this.safeSetData({
              isLoggedIn: true,
              loginStep: 'start',
              userInfo: {
                avatar: storedUserInfo.avatarUrl || storedUserInfo.avatar || '/images/default-avatar.png',
                nickname: storedUserInfo.nickName || storedUserInfo.nickname || '用户',
                userId: storedUserInfo.userId || '---',
                userToken: storedUserInfo.userToken || storedUserInfo.userId || '---'
              }
            }, () => {
              this.loadPointsInfo();
            });
          }
        })
        .catch(() => {
          if (!this.data._pageAlive) {
            return;
          }
          this.safeSetData({
            isLoggedIn: true,
            loginStep: 'start',
            userInfo: {
              avatar: storedUserInfo.avatarUrl || storedUserInfo.avatar || '/images/default-avatar.png',
              nickname: storedUserInfo.nickName || storedUserInfo.nickname || '用户',
              userId: storedUserInfo.userId || '---',
              userToken: storedUserInfo.userToken || storedUserInfo.userId || '---'
            }
          }, () => {
            this.loadPointsInfo();
          });
        });
    } else {
      this.safeSetData({
        isLoggedIn: false,
        loginStep: 'start',
        userInfo: {
          avatar: '/images/default-avatar.png',
          nickname: '用户',
          userId: '---'
        },
        pointsInfo: {
          balance: 0
        }
      });
    }
  },

  loadPointsInfo: function() {
    const userInfo = auth.getStoredUserInfo();
    const userToken = userInfo ? (userInfo.userToken || userInfo.userId) : '';
    const userId = userInfo ? userInfo.userId : 0;
    
    if (!userInfo || (!userToken && !userId)) {
      return;
    }

    api.getPointsInfo(userToken, userId)
      .then((res) => {
        if (!this.data._pageAlive) {
          return;
        }
        if (res.success) {
          this.safeSetData({
            pointsInfo: res.data
          });
        }
      })
      .catch((err) => {
      });
  },

  handleQuickLogin: function() {
    this.safeSetData({ loggingOut: true })
    wx.showLoading({ title: '登录中...' })

    auth.doLogin()
      .then((result) => {
        if (!this.data._pageAlive) {
          return;
        }
        wx.hideLoading()
        
        if (result.needComplete) {
          this.safeSetData({
            loginStep: 'complete',
            loggingOut: false
          })
        } else {
          this.safeSetData({
            isLoggedIn: true,
            loginStep: 'start',
            loggingOut: false,
            userInfo: {
              avatar: result.avatar || result.avatarUrl || '/images/default-avatar.png',
              nickname: result.nickname || result.nickName || '用户',
              userId: result.userId || result.id,
              userToken: result.userToken || result.userId || result.id
            }
          }, () => {
            this.loadPointsInfo();
          })
          wx.showToast({
            title: '登录成功',
            icon: 'success'
          })
        }
      })
      .catch((err) => {
        wx.hideLoading()
        this.safeSetData({ loggingOut: false })
        wx.showToast({
          title: err.message || '登录失败，请重试',
          icon: 'none'
        })
      })
  },

  onChooseAvatar: function(e) {
    this.safeSetData({
      tempAvatarUrl: e.detail.avatarUrl
    })
  },

  onNicknameInput: function(e) {
    this.safeSetData({
      tempNickname: e.detail.value
    })
  },

  handleLogin: function() {
    const { tempAvatarUrl, tempNickname } = this.data

    if (!tempNickname || tempNickname.trim() === '') {
      wx.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }

    if (!tempAvatarUrl) {
      wx.showToast({
        title: '请选择头像',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '登录中...' })

    auth.doLoginWithManual(tempAvatarUrl, tempNickname)
      .then((result) => {
        if (!this.data._pageAlive) {
          return;
        }
        const openid = result.openid
        const userId = result.userId

        auth.uploadAvatar(tempAvatarUrl, openid)
          .then((uploadResult) => {
            if (!this.data._pageAlive) {
              return;
            }
            wx.hideLoading()
            this.safeSetData({
              isLoggedIn: true,
              loginStep: 'start',
              userInfo: {
                avatar: uploadResult.data.avatar_url,
                nickname: tempNickname,
                userId: userId,
                userToken: result.userToken || userId
              },
              tempAvatarUrl: '',
              tempNickname: ''
            }, () => {
              this.loadPointsInfo();
            })
            wx.showToast({
              title: '登录成功',
              icon: 'success'
            })
          })
          .catch((err) => {
            if (!this.data._pageAlive) {
              return;
            }
            wx.hideLoading()
            this.safeSetData({
              isLoggedIn: true,
              loginStep: 'start',
              userInfo: {
                avatar: tempAvatarUrl,
                nickname: tempNickname,
                userId: userId,
                userToken: result.userToken || userId
              },
              tempAvatarUrl: '',
              tempNickname: ''
            }, () => {
              this.loadPointsInfo();
            })
            wx.showToast({
              title: '登录成功',
              icon: 'success'
            })
          })
      })
      .catch((err) => {
        if (!this.data._pageAlive) {
          return;
        }
        wx.hideLoading()
        wx.showToast({
          title: err.message || '登录失败，请重试',
          icon: 'none'
        })
      })
  },

  handleLogout: function() {
    this.safeSetData({ loggingOut: true })
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          auth.logout()
          this.safeSetData({
            isLoggedIn: false,
            loginStep: 'start',
            userInfo: {
              avatar: '/images/default-avatar.png',
              nickname: '用户',
              userId: '---'
            }
          })
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
        this.safeSetData({ loggingOut: false })
      },
      fail: () => {
        this.safeSetData({ loggingOut: false })
      }
    })
  },

  goToEdit: function() {
    wx.navigateTo({
      url: '/pages/profile/edit/edit'
    })
  },

  goToPointsLog: function() {
    wx.navigateTo({
      url: '/pages/points-log/points-log'
    })
  },

  onMenuTap: function(e) {
    const item = e.currentTarget.dataset.item
    
    if (item.id === 'about') {
      this.safeSetData({ showAboutModal: true })
      return
    }

    if (item.id === 'vip') {
      wx.navigateTo({
        url: '/pages/vip/vip'
      })
      return
    }

    if (item.id === 'tutorial') {
      wx.navigateTo({
        url: '/pages/tutorial/tutorial'
      })
      return
    }

    if (!item.enabled) {
      wx.showToast({
        title: '功能即将上线',
        icon: 'none'
      })
      return
    }
  },

  closeAboutModal: function() {
    this.safeSetData({ showAboutModal: false })
  },

  stopPropagation: function() {},

  onTabTap: function(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === 'index') {
      wx.switchTab({
        url: '/pages/index/index'
      })
    }
  }
})
