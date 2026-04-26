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
    updateTimer: null
  },

  onLoad: function (options) {
    setTimeout(() => {
      const app = getApp()
      this.setData({
        isHarmonyOS: app.globalData.isHarmonyOS
      })
      
      this.getNoticeContent()
      this.getAnnouncementContent()
      
      this.data.updateTimer = setInterval(() => {
        this.getNoticeContent()
        this.getAnnouncementContent()
      }, 5000)
    }, 100)
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
        console.log('解析错误:', err)
        
        let errorMessage = '解析失败，请检查链接是否正确或稍后重试'
        
        if (err) {
          console.log('err.code:', err.code)
          console.log('err.message:', err.message)
          console.log('err.error:', err.error)
          
          if (err.code === 401) {
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
            console.log(`下载失败，状态码：${res.statusCode}，正在重试...`)
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
        
        console.log('下载失败，错误信息：', err)
        
        if (retryCount < maxRetries) {
          console.log(`下载失败，正在重试...`)
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
          console.error('创建视频上下文失败:', e)
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
            console.error('播放视频失败:', e)
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
          console.error('暂停视频失败:', e)
        }
      }
    }
  },

  refreshVideo: function() {
    if (!this.videoContext) {
      try {
        this.videoContext = wx.createVideoContext('previewVideo', this)
      } catch (e) {
        console.error('创建视频上下文失败:', e)
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
      console.error('暂停视频失败:', e)
    }
    
    setTimeout(() => {
      if (this.videoContext) {
        try {
          this.videoContext.play()
        } catch (e) {
          console.error('播放视频失败:', e)
          wx.showToast({
            title: '视频播放失败',
            icon: 'none'
          })
        }
      }
    }, 300)
  },

  onVideoPlay: function() {
    console.log('视频开始播放')
  },

  onVideoPause: function() {
    console.log('视频暂停')
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
      console.log('视频链接已失效，需要重新解析')
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
        console.log('打开视频成功')
      },
      fail: (err) => {
        console.error('打开视频失败:', err)
        wx.showToast({
          title: '无法打开视频',
          icon: 'none'
        })
      }
    })
  },

  onUnload: function() {
    if (this.data.updateTimer) {
      clearInterval(this.data.updateTimer)
    }
    
    if (this.videoContext) {
      this.videoContext = null
    }
  },
  
  onHide: function() {
  },
  
  onShow: function() {
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: '#FF6B35'
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

  showCustomerServiceTip: function() {
    console.log('客服按钮被点击');
  }
})
