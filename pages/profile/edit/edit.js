/**
 * @fileoverview 资料修改页面逻辑
 * @description 处理用户头像和昵称修改功能
 * @author 开发者
 * @version 1.0.0
 */

const auth = require('../../../utils/auth.js')
const api = require('../../../utils/api.js')

Page({
  data: {
    statusBarHeight: 20,
    avatarUrl: '',
    nickname: '',
    originalAvatarUrl: '',
    originalNickname: '',
    errorMsg: '',
    submitting: false,
    hasChanges: false,
    _pageAlive: true
  },

  safeSetData: function(data, callback) {
    if (!this.data._pageAlive) {
      return
    }
    try {
      this.setData(data, callback)
    } catch (e) {
    }
  },

  onLoad: function(options) {
    this.initPage()
  },

  initPage: function() {
    const app = getApp()
    const systemInfo = app.globalData.systemInfo || wx.getSystemInfoSync()
    const statusBarHeight = systemInfo.statusBarHeight || 20

    const userInfo = auth.getStoredUserInfo()
    const avatarUrl = userInfo ? (userInfo.avatarUrl || userInfo.avatar || '') : ''
    const nickname = userInfo ? (userInfo.nickname || userInfo.nickName || '') : ''

    this.safeSetData({
      statusBarHeight: statusBarHeight,
      avatarUrl: avatarUrl,
      nickname: nickname,
      originalAvatarUrl: avatarUrl,
      originalNickname: nickname
    })
  },

  onShow: function() {
    if (!this.data._pageAlive) {
      return
    }
  },

  onUnload: function() {
    this.data._pageAlive = false
  },

  onChooseAvatar: function() {
    const that = this
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        const originalPath = res.tempFiles[0].tempFilePath
        const fileSize = res.tempFiles[0].size

        if (fileSize > 200 * 1024) {
          wx.compressImage({
            src: originalPath,
            quality: 80,
            success: function(compressRes) {
              that.safeSetData({
                avatarUrl: compressRes.tempFilePath,
                hasChanges: true
              })
            },
            fail: function() {
              that.safeSetData({
                avatarUrl: originalPath,
                hasChanges: true
              })
              wx.showToast({
                title: '图片压缩失败，使用原图',
                icon: 'none'
              })
            }
          })
        } else {
          that.safeSetData({
            avatarUrl: originalPath,
            hasChanges: true
          })
        }
      },
      fail: function(err) {
        if (err.errMsg && err.errMsg.includes('cancel')) {
          return
        }
        wx.showToast({
          title: '选择头像失败',
          icon: 'none'
        })
      }
    })
  },

  onNicknameInput: function(e) {
    const nickname = e.detail.value
    this.safeSetData({
      nickname: nickname,
      hasChanges: nickname !== this.data.originalNickname || this.data.avatarUrl !== this.data.originalAvatarUrl
    })
  },

  onNicknameBlur: function(e) {
    const nickname = e.detail.value
    this.validateNickname(nickname)
  },

  validateNickname: function(nickname) {
    if (!nickname || nickname.trim().length === 0) {
      this.safeSetData({ errorMsg: '请输入昵称' })
      return false
    }
    if (nickname.length < 2 || nickname.length > 20) {
      this.safeSetData({ errorMsg: '昵称长度需在2-20个字符之间' })
      return false
    }
    if (/[<>\"'%]/.test(nickname)) {
      this.safeSetData({ errorMsg: '昵称不能包含特殊字符' })
      return false
    }
    this.safeSetData({ errorMsg: '' })
    return true
  },

  onSubmit: function() {
    const that = this
    const nickname = this.data.nickname.trim()

    if (!this.validateNickname(nickname)) {
      wx.showToast({
        title: this.data.errorMsg,
        icon: 'none'
      })
      return
    }

    if (!this.data.hasChanges) {
      wx.showToast({
        title: '没有修改内容',
        icon: 'none'
      })
      return
    }

    this.safeSetData({ submitting: true })

    const userToken = auth.getUserToken()
    if (!userToken) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      this.safeSetData({ submitting: false })
      return
    }

    const userInfo = auth.getStoredUserInfo()
    const openid = userInfo ? userInfo.openid : ''

    const uploadAndUpdate = (avatarUrl) => {
      const params = {
        user_token: userToken,
        nickname: nickname
      }

      if (avatarUrl) {
        params.avatar_url = avatarUrl
      } else if (this.data.originalAvatarUrl) {
        params.avatar_url = this.data.originalAvatarUrl
      }

      api.updateUserInfo(params).then((res) => {
        wx.showToast({
          title: '修改成功',
          icon: 'success'
        })

        const currentUserInfo = auth.getStoredUserInfo() || {}
        const newAvatar = res.data && res.data.avatar_url ? res.data.avatar_url : (currentUserInfo.avatar || this.data.originalAvatarUrl)
        const updatedUserInfo = {
          ...currentUserInfo,
          nickname: nickname,
          nickName: nickname,
          avatar: newAvatar || this.data.originalAvatarUrl,
          avatarUrl: newAvatar || this.data.originalAvatarUrl
        }
        wx.setStorageSync('userInfo', updatedUserInfo)

        setTimeout(() => {
          const pages = getCurrentPages()
          const profilePage = pages.find(p => p.route === 'pages/profile/profile')
          if (profilePage) {
            profilePage.checkLoginStatus()
          }
          wx.navigateBack()
        }, 800)
      }).catch((err) => {
        wx.showToast({
          title: err.message || '修改失败',
          icon: 'none'
        })
      }).finally(() => {
        that.safeSetData({ submitting: false })
      })
    }

    const currentAvatarUrl = this.data.avatarUrl
    const isTempFile = currentAvatarUrl && (currentAvatarUrl.startsWith('http://tmp') || currentAvatarUrl.startsWith('wxfile://') || currentAvatarUrl.startsWith('/tmp'))

    if (currentAvatarUrl && currentAvatarUrl !== this.data.originalAvatarUrl && !isTempFile) {
      uploadAndUpdate(currentAvatarUrl)
    } else if (currentAvatarUrl && currentAvatarUrl !== this.data.originalAvatarUrl) {
      if (!openid) {
        wx.showToast({
          title: '用户信息不完整',
          icon: 'none'
        })
        this.safeSetData({ submitting: false })
        return
      }

      auth.uploadAvatar(currentAvatarUrl, openid).then((uploadRes) => {
        const newAvatarUrl = uploadRes.data ? uploadRes.data.avatar_url : ''
        uploadAndUpdate(newAvatarUrl)
      }).catch((err) => {
        wx.showToast({
          title: err.message || '上传头像失败',
          icon: 'none'
        })
        this.safeSetData({ submitting: false })
      })
    } else {
      uploadAndUpdate('')
    }
  },

  onNavigateBack: function() {
    wx.navigateBack()
  }
})
