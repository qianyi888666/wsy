const api = require('../../utils/api.js')

Page({
  data: {
    videoUrl: '',
    loading: false,
    error: '',
    videoData: null,
    statusBarHeight: 0,
    showLink: false,
    showVideoPreview: false,
    isHarmonyOS: false,
    noticeContent: '欢迎使用短视频无水印下载小程序！！！',
    announcementContent: '欢迎使用短视频无水印下载，本工具提供短视频无水印下载功能！',
    announcementBarTop: 0,
    updateTimer: null,
    _pageAlive: true,
    _initialized: false
  },

  onLoad: function (options) {
    this.data._pageAlive = true
    this.data._initialized = false

    setTimeout(() => {
      const app = getApp()
      this.setData({
        isHarmonyOS: app.globalData.isHarmonyOS
      })

      this.getNoticeContent()
      this.getAnnouncementContent()

      this.data.updateTimer = setInterval(() => {
        if (this.data._pageAlive) {
          this.getNoticeContent()
          this.getAnnouncementContent()
        }
      }, 5000)
      this.data._initialized = true
    }, 100)
  },

  onShow: function() {
    const auth = require('../../utils/auth.js')
    auth.checkTokenExpiry()

    if (!this.data.updateTimer && this.data._pageAlive && this.data._initialized) {
      this.data.updateTimer = setInterval(() => {
        if (this.data._pageAlive) {
          this.getNoticeContent()
          this.getAnnouncementContent()
        }
      }, 5000)
    }
  },

  onHide: function() {
    if (this.data.updateTimer) {
      clearInterval(this.data.updateTimer)
      this.data.updateTimer = null
    }
  },

  onUnload: function() {
    if (this.data.updateTimer) {
      clearInterval(this.data.updateTimer)
      this.data.updateTimer = null
    }
    this.data._pageAlive = false
  },

  onUrlInput: function(e) {
    this.setData({
      videoUrl: e.detail.value,
      error: ''
    })
  },

  extractVideoUrl: function(text) {
    const douyinUrlRegex = /https:\/\/v\.douyin\.com\/([A-Za-z0-9_-]{11})\//g
    const douyinMatches = text.match(douyinUrlRegex)
    
    if (douyinMatches && douyinMatches.length > 0) {
      return douyinMatches[0]
    }
    
    const kuaishouUrlRegex = /https:\/\/(?:v\.|www\.)?kuaishou\.com\/[f\/]?([A-Za-z0-9]+)/g
    const kuaishouMatches = text.match(kuaishouUrlRegex)
    
    if (kuaishouMatches && kuaishouMatches.length > 0) {
      return kuaishouMatches[0]
    }
    
    const xiaohongshuUrlRegex = /https?:\/\/xhslink\.com\/[a-zA-Z0-9\/]+/g
    const xiaohongshuMatches = text.match(xiaohongshuUrlRegex)
    
    if (xiaohongshuMatches && xiaohongshuMatches.length > 0) {
      return xiaohongshuMatches[0]
    }
    
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g
    const urlMatches = text.match(urlRegex)
    
    if (urlMatches && urlMatches.length > 0) {
      for (const url of urlMatches) {
        if (api.detectVideoPlatform(url)) {
          return url
        }
      }
    }
    
    return null
  },

  normalizeVideoData: function(data, platform) {
    let videoUrl = data.video_url || data.video || data.url || ''
    let cover = data.cover || data.cover_url || ''
    let title = data.title || ''
    let images = data.images || []
    
    if (Array.isArray(videoUrl)) {
      videoUrl = videoUrl[0]
    }
    
    if (Array.isArray(cover)) {
      cover = cover[0]
    }
    
    if (!videoUrl && images.length === 0) {
      throw new Error('未找到有效媒体信息')
    }
    
    const normalizedData = {
      cover: cover,
      url: videoUrl,
      title: title,
      images: images,
      platform: platform
    }
    
    return normalizedData
  },

  doParseVideo: function() {
    let videoUrl = this.data.videoUrl.trim()
    if (!videoUrl) {
      this.setData({ error: '请输入视频链接' })
      return
    }

    this.setData({
      loading: true,
      error: '',
      videoData: null
    })

    const app = getApp()
    const auth = require('../../utils/auth.js')
    const userInfo = auth.getStoredUserInfo()
    const userToken = userInfo ? (userInfo.userToken || '') : ''
    const userId = userInfo ? userInfo.userId : 0

    api.parseVideo(videoUrl, userToken, userId)
      .then(res => {
        if (!res || !res.data) {
          throw new Error('未找到有效媒体信息')
        }
        
        const videoData = this.normalizeVideoData(res.data, 'unknown')
        
        if (res.data.points_balance !== undefined) {
          app.globalData.pointsInfo.balance = res.data.points_balance
        }
        
        this.setData({
          loading: false,
          videoData,
          showVideoPreview: false
        })
        
        let successMsg = '解析成功'
        if (res.data.parse_type === 'free') {
          const remaining = res.data.free_remaining !== undefined ? res.data.free_remaining : 0
          successMsg += '，扣除1次免费解析，剩余' + remaining + '次'
        } else if (res.data.parse_type === 'points') {
          const remaining = res.data.points_balance !== undefined ? res.data.points_balance : 0
          successMsg += '，扣除1点积分，剩余' + remaining + '积分'
        }
        
        wx.showToast({
          title: successMsg,
          icon: 'none',
          duration: 3000
        })
        
        wx.pageScrollTo({
          scrollTop: 500,
          duration: 300
        })
      })
      .catch(err => {
        let errorMessage = '解析失败，请检查链接是否正确或稍后重试'

        if (err) {
          if (err.code === 401) {
            this.setData({ loading: false })
            wx.showModal({
              title: '提示',
              content: err.message || '请先登录后再使用解析功能',
              confirmText: '去登录',
              success: (res) => {
                if (res.confirm) {
                  wx.switchTab({
                    url: '/pages/profile/profile'
                  })
                }
              }
            })
            return
          }
          else if (err.code === 402) {
            this.setData({ loading: false })
            const auth = require('../../utils/auth.js')
            auth.logout()
            wx.showModal({
              title: '登录已失效',
              content: err.message || '登录已过期，请重新登录',
              confirmText: '重新登录',
              success: (res) => {
                if (res.confirm) {
                  wx.switchTab({
                    url: '/pages/profile/profile'
                  })
                }
              }
            })
            return
          }
          else if (err.code === 1004) {
            const pointsErrorMsg = '当前积分不足，请明天再来或者在会员中心领取积分'
            this.setData({ 
              loading: false,
              error: pointsErrorMsg
            })
            wx.showToast({
              title: pointsErrorMsg,
              icon: 'none',
              duration: 3000
            })
            wx.pageScrollTo({
              scrollTop: 500,
              duration: 300
            })
            return
          }
          else if (err.code === 1002 || err.code === 1001) {
            errorMessage = '未找到有效媒体信息，请检查链接是否为有效的短视频链接'
          }
          else if (err.code === 1005) {
            errorMessage = '会员等级不足，请联系开通会员或者升级会员等级'
          }
          else if (err.message && (err.message.includes('积分不足') || err.message.includes('积分均已用完') || err.message.includes('免费次数和积分均已用完'))) {
            errorMessage = ''
          }
          else if (err.message && (err.message.includes('次数不足') || err.message.includes('免费次数') || err.message.includes('已用完'))) {
            errorMessage = '当前免费次数已用完，请明天再来或者升级VIP'
          }
          else if (err.message && err.message.includes('请先登录')) {
            this.setData({ loading: false })
            wx.showModal({
              title: '提示',
              content: err.message,
              confirmText: '去登录',
              success: (res) => {
                if (res.confirm) {
                  wx.switchTab({
                    url: '/pages/profile/profile'
                  })
                }
              }
            })
            return
          }
          else if (err.message && err.message.includes('未找到有效媒体信息')) {
            errorMessage = '未找到有效媒体信息，请检查链接是否为有效的短视频链接'
          } else if (err.message && err.message.includes('网络请求失败')) {
            errorMessage = '网络请求失败，请检查网络连接后重试'
          } else if (err.message && err.message.includes('请求失败')) {
            errorMessage = '服务器请求失败，请稍后重试'
          } else if (err.message) {
            errorMessage = err.message
          }
          
          if (err.error && err.error.errMsg) {
            const errMsg = err.error.errMsg
            if (errMsg.includes('timeout') || errMsg.includes('超时')) {
              errorMessage = '请求超时，请稍后重试'
            } else if (errMsg.includes('cancel')) {
              errorMessage = '已取消请求'
            }
          }
        }
        
        this.setData({
          loading: false,
          error: errorMessage
        })

        wx.pageScrollTo({
          scrollTop: 500,
          duration: 300
        })
      })
  },

  parseVideo: function() {
    const auth = require('../../utils/auth.js')
    const isLoggedIn = auth.checkLoginStatus()
    
    if (!isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再使用解析功能',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            wx.switchTab({
              url: '/pages/profile/profile'
            })
          }
        }
      })
      return
    }
    
    let videoUrl = this.data.videoUrl.trim()
    if (!videoUrl) {
      this.setData({ error: '请输入视频链接' })
      return
    }

    const extractedUrl = this.extractVideoUrl(videoUrl)
    if (extractedUrl) {
      videoUrl = extractedUrl
      this.setData({ videoUrl })
    }

    this.setData({
      videoData: null,
      error: '',
      showLink: false,
      showVideoPreview: false
    })

    this.doParseVideo()
  },

  downloadVideo: function() {
    if (!this.data.videoData || !this.data.videoData.url) {
      wx.showToast({
        title: '视频链接无效',
        icon: 'none'
      })
      return
    }

    let downloadUrl = this.data.videoData.url
    
    if (Array.isArray(downloadUrl)) {
      downloadUrl = downloadUrl[0]
    }
    
    if (typeof downloadUrl === 'string' && downloadUrl.length > 0) {
    } else {
      wx.showToast({
        title: '视频链接格式错误',
        icon: 'none'
      })
      return
    }
    
    this.downloadWithRetry(downloadUrl, 0)
  },

  downloadWithRetry: function(downloadUrl, retryCount) {
    const maxRetries = 2
    
    wx.showLoading({
      title: retryCount === 0 ? '准备下载...' : `重新下载中 (${retryCount}/${maxRetries})...`,
    })
    
    wx.downloadFile({
      url: downloadUrl,
      success: (res) => {
        wx.hideLoading()
        
        if (res.statusCode === 200) {
          const tempFilePath = res.tempFilePath
          
          wx.saveVideoToPhotosAlbum({
            filePath: tempFilePath,
            success: () => {
              wx.showToast({
                title: '已保存到相册',
                icon: 'success',
                duration: 2000
              })
            },
            fail: (err) => {
              wx.hideLoading()
              
              if (err.errMsg.includes('auth deny') || err.errMsg.includes('auth denied')) {
                wx.showModal({
                  title: '需要授权',
                  content: '保存视频需要访问您的相册权限，请在设置中允许',
                  confirmText: '去设置',
                  success: (res) => {
                    if (res.confirm) {
                      wx.openSetting()
                    }
                  }
                })
              } else {
                wx.showModal({
                  title: '保存失败',
                  content: '无法保存视频到相册，是否复制链接到浏览器中下载？',
                  confirmText: '复制链接',
                  cancelText: '取消',
                  success: (res) => {
                    if (res.confirm) {
                      wx.setClipboardData({
                        data: downloadUrl,
                        success: () => {
                          wx.showToast({
                            title: '链接已复制',
                            icon: 'success'
                          })
                        }
                      })
                    }
                  }
                })
              }
            }
          })
        } else {
          if (retryCount < maxRetries) {
            setTimeout(() => {
              this.downloadWithRetry(downloadUrl, retryCount + 1)
            }, 1000)
          } else {
            wx.showModal({
              title: '下载失败',
              content: '视频下载失败，是否复制链接到浏览器中下载？',
              confirmText: '复制链接',
              cancelText: '取消',
              success: (res) => {
                if (res.confirm) {
                  wx.setClipboardData({
                    data: downloadUrl,
                    success: () => {
                      wx.showToast({
                        title: '链接已复制',
                        icon: 'success'
                      })
                    }
                  })
                }
              }
            })
          }
        }
      },
      fail: (err) => {
        wx.hideLoading()

        if (retryCount < maxRetries) {
          setTimeout(() => {
            this.downloadWithRetry(downloadUrl, retryCount + 1)
          }, 1000)
        } else {
          wx.showModal({
            title: '下载失败',
            content: '视频下载失败，是否复制链接到浏览器中下载？',
            confirmText: '复制链接',
            cancelText: '取消',
            success: (res) => {
              if (res.confirm) {
                wx.setClipboardData({
                  data: downloadUrl,
                  success: () => {
                    wx.showToast({
                      title: '链接已复制',
                      icon: 'success'
                    })
                  }
                })
              }
            }
          })
        }
      }
    })
  },

  copyLink: function() {
    if (!this.data.videoData || !this.data.videoData.url) {
      return
    }

    wx.setClipboardData({
      data: this.data.videoData.url,
      success: () => {
        wx.showToast({
          title: '链接已复制',
          icon: 'success'
        })
      }
    })
  },

  toggleLinkDisplay: function() {
    this.setData({
      showLink: !this.data.showLink
    })
  },

  toggleVideoPreview: function() {
    const newShowVideoPreview = !this.data.showVideoPreview
    
    if (newShowVideoPreview && this.data.videoData) {
      if (!this.data.videoData.url) {
        wx.showToast({
          title: '视频链接无效',
          icon: 'none'
        })
        return
      }
    }
    
    this.setData({
      showVideoPreview: newShowVideoPreview
    })
    
    if (newShowVideoPreview) {
      if (!this.videoContext) {
        try {
          this.videoContext = wx.createVideoContext('previewVideo', this)
        } catch (e) {
          this.setData({
            showVideoPreview: false
          })
          wx.showToast({
            title: '视频预览功能不可用',
            icon: 'none'
          })
          return
        }
      }
      setTimeout(() => {
        if (this.videoContext) {
          try {
            this.videoContext.play()
          } catch (e) {
            this.setData({
              showVideoPreview: false
            })
            wx.showToast({
              title: '视频播放失败',
              icon: 'none'
            })
          }
        }
      }, 100)
    } else {
      if (this.videoContext) {
        try {
          this.videoContext.pause()
        } catch (e) {
        }
      }
    }
  },

  refreshVideo: function() {
    if (!this.videoContext) {
      try {
        this.videoContext = wx.createVideoContext('previewVideo', this)
      } catch (e) {
        wx.showToast({
          title: '视频刷新功能不可用',
          icon: 'none'
        })
        return
      }
    }
    
    try {
      this.videoContext.pause()
    } catch (e) {
    }

    setTimeout(() => {
      if (this.videoContext) {
        try {
          this.videoContext.play()
        } catch (e) {
          wx.showToast({
            title: '视频播放失败',
            icon: 'none'
          })
        }
      }
    }, 300)
  },

  onVideoPlay: function() {
  },

  onVideoPause: function() {
  },

  onVideoEnded: function() {
    this.setData({
      showVideoPreview: false
    })
  },

  onVideoError: function(e) {
    let errorMsg = '视频加载失败'
    
    if (e.detail && e.detail.errMsg) {
      if (e.detail.errMsg.includes('network')) {
        errorMsg = '网络错误，请检查网络连接'
      } else if (e.detail.errMsg.includes('format')) {
        errorMsg = '视频格式不支持'
      } else if (e.detail.errMsg.includes('decode')) {
        errorMsg = '视频解码失败'
      } else if (e.detail.errMsg.includes('Failed to load')) {
        errorMsg = '视频链接已失效，请重新解析'
      }
    }
    
    wx.showToast({
      title: errorMsg,
      icon: 'none',
      duration: 2000
    })
    
    this.setData({
      showVideoPreview: false
    })
    
    if (e.detail && e.detail.errMsg && e.detail.errMsg.includes('Failed to load')) {
    }
  },

  openVideo: function() {
    if (!this.data.videoData || !this.data.videoData.url) {
      wx.showToast({
        title: '视频链接无效',
        icon: 'none'
      })
      return
    }

    wx.openDocument({
      filePath: this.data.videoData.url,
      success: (res) => {
      },
      fail: (err) => {
        wx.showToast({
          title: '无法打开视频',
          icon: 'none'
        })
      }
    })
  },

  onShareAppMessage: function() {
    return {
      title: this.data.videoData ? this.data.videoData.title : '短视频无水印下载',
      path: '/pages/index/index',
      imageUrl: '/images/12.png'
    }
  },

  onShareTimeline: function() {
    return {
      title: '短视频无水印下载',
      query: '',
      imageUrl: '/images/12.png'
    }
  },

  getNoticeContent: function() {
    api.request('api.php?action=get_notice')
      .then(res => {
        if (res.success && res.data && res.data.content) {
          if (res.data.content !== this.data.noticeContent) {
            this.setData({
              noticeContent: res.data.content
            })
          }
        }
      })
      .catch(err => {
      })
  },

  getAnnouncementContent: function() {
    api.request('api.php?action=get_announcement')
      .then(res => {
        if (res.success && res.data && res.data.content) {
          if (res.data.content !== this.data.announcementContent) {
            this.setData({
              announcementContent: res.data.content
            })
          }
        }
      })
      .catch(err => {
      })
  },

  goToProfile: function() {
    wx.navigateTo({
      url: '/pages/profile/profile',
      fail: function() {
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  },

  onCustomerServiceTap: function() {
  },

  stopUpdateTimer: function() {
    if (this.data.updateTimer) {
      clearInterval(this.data.updateTimer)
      this.data.updateTimer = null
    }
  }
})
