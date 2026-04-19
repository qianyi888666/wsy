// pages/index/index.js
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
    announcementBarTop: 0, // 公告栏距离顶部的距离
    updateTimer: null // 定时器ID
  },

  onLoad: function (options) {
    // 延迟初始化，确保组件框架完全加载
    setTimeout(() => {
      // 获取平台信息
      const app = getApp()
      this.setData({
        isHarmonyOS: app.globalData.isHarmonyOS
      })
      
      // 获取通知和公告内容
      this.getNoticeContent()
      this.getAnnouncementContent()
      
      // 设置定时器，每5秒获取一次最新数据
      this.data.updateTimer = setInterval(() => {
        this.getNoticeContent()
        this.getAnnouncementContent()
      }, 5000)
    }, 100)
  },

  // 输入框内容变化
  onUrlInput: function(e) {
    this.setData({
      videoUrl: e.detail.value,
      error: ''
    })
  },

  // 提取视频链接（支持抖音、快手和小红书）
  extractVideoUrl: function(text) {
    // 抖音短链接的正则表达式
    const douyinUrlRegex = /https:\/\/v\.douyin\.com\/([A-Za-z0-9_-]{11})\//g
    const douyinMatches = text.match(douyinUrlRegex)
    
    if (douyinMatches && douyinMatches.length > 0) {
      return douyinMatches[0]
    }
    
    // 快手链接的正则表达式
    const kuaishouUrlRegex = /https:\/\/(?:v\.|www\.)?kuaishou\.com\/[f\/]?([A-Za-z0-9]+)/g
    const kuaishouMatches = text.match(kuaishouUrlRegex)
    
    if (kuaishouMatches && kuaishouMatches.length > 0) {
      return kuaishouMatches[0]
    }
    
    // 小红书链接的正则表达式
    const xiaohongshuUrlRegex = /https?:\/\/xhslink\.com\/[a-zA-Z0-9\/]+/g
    const xiaohongshuMatches = text.match(xiaohongshuUrlRegex)
    
    if (xiaohongshuMatches && xiaohongshuMatches.length > 0) {
      return xiaohongshuMatches[0]
    }
    
    // 如果没有匹配到短链接，尝试提取完整URL
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g
    const urlMatches = text.match(urlRegex)
    
    if (urlMatches && urlMatches.length > 0) {
      // 检查是否是抖音、快手或小红书链接
      for (const url of urlMatches) {
        if (api.detectVideoPlatform(url)) {
          return url
        }
      }
    }
    
    return null
  },

  // 标准化视频数据结构
  normalizeVideoData: function(data, platform) {
    // 基础字段 - 适配新的API返回结构，优先使用 video_url
    let videoUrl = data.video_url || data.video || data.url || ''
    let cover = data.cover || data.cover_url || ''
    let title = data.title || ''
    let images = data.images || []
    
    // 如果URL是数组，取第一个元素
    if (Array.isArray(videoUrl)) {
      videoUrl = videoUrl[0]
    }
    
    // 如果封面是数组，取第一个元素
    if (Array.isArray(cover)) {
      cover = cover[0]
    }
    
    // 检查是否有有效的媒体URL（视频或图片）
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

  // 解析视频
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

  // 解析视频
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

  // 下载视频
  downloadVideo: function() {
    if (!this.data.videoData || !this.data.videoData.url) {
      wx.showToast({
        title: '视频链接无效',
        icon: 'none'
      })
      return
    }

    let downloadUrl = this.data.videoData.url
    
    // 检查URL类型，如果是数组则取第一个元素
    if (Array.isArray(downloadUrl)) {
      downloadUrl = downloadUrl[0]
    }
    
    // 简单验证URL格式（不使用URL构造函数）
    if (typeof downloadUrl === 'string' && downloadUrl.length > 0) {
      // 验证通过
    } else {
      wx.showToast({
        title: '视频链接格式错误',
        icon: 'none'
      })
      return
    }
    
    // 开始下载，带重试机制
    this.downloadWithRetry(downloadUrl, 0)
  },

  // 带重试机制的下载
  downloadWithRetry: function(downloadUrl, retryCount) {
    const maxRetries = 2 // 最多重试2次（总共尝试3次）
    
    wx.showLoading({
      title: retryCount === 0 ? '准备下载...' : `重新下载中 (${retryCount}/${maxRetries})...`,
    })
    
    // 下载文件
    wx.downloadFile({
      url: downloadUrl,
      success: (res) => {
        wx.hideLoading()
        
        if (res.statusCode === 200) {
          // 下载成功，保存到本地
          const tempFilePath = res.tempFilePath
          
          // 保存视频到相册
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
              
              // 检查是否是权限问题
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
                // 保存失败，提示用户复制链接到浏览器下载
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
          // HTTP状态码不是200，尝试重试
          if (retryCount < maxRetries) {
            console.log(`下载失败，状态码：${res.statusCode}，正在重试...`)
            setTimeout(() => {
              this.downloadWithRetry(downloadUrl, retryCount + 1)
            }, 1000) // 延迟1秒后重试
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
        
        // 下载失败，尝试重试
        if (retryCount < maxRetries) {
          console.log(`下载失败，正在重试...`)
          setTimeout(() => {
            this.downloadWithRetry(downloadUrl, retryCount + 1)
          }, 1000) // 延迟1秒后重试
        } else {
          // 重试次数用尽，提示用户复制链接
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

  // 复制链接
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

  // 切换链接显示状态
  toggleLinkDisplay: function() {
    this.setData({
      showLink: !this.data.showLink
    })
  },

  // 切换视频预览状态
  toggleVideoPreview: function() {
    const newShowVideoPreview = !this.data.showVideoPreview
    
    // 检查视频URL是否有效
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
    
    // 如果显示视频预览，创建视频上下文并尝试播放
    if (newShowVideoPreview) {
      // 确保视频上下文存在
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
      // 延迟播放视频，确保CSS已应用
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
      // 隐藏视频预览时，暂停视频播放
      if (this.videoContext) {
        try {
          this.videoContext.pause()
        } catch (e) {
          console.error('暂停视频失败:', e)
        }
      }
    }
  },

  // 刷新视频
  refreshVideo: function() {
    // 确保视频上下文存在
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
    
    // 暂停当前播放
    try {
      this.videoContext.pause()
    } catch (e) {
      console.error('暂停视频失败:', e)
    }
    
    // 短暂延迟后重新播放
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

  // 视频播放事件
  onVideoPlay: function() {
    // 视频开始播放时的处理
    console.log('视频开始播放')
  },

  // 视频暂停事件
  onVideoPause: function() {
    // 视频暂停时的处理
    console.log('视频暂停')
  },

  // 视频播放结束事件
  onVideoEnded: function() {
    // 播放结束后，自动切换回封面预览
    this.setData({
      showVideoPreview: false
    })
  },

  // 视频播放错误事件
  onVideoError: function(e) {
    let errorMsg = '视频加载失败'
    
    // 根据错误码提供更具体的错误信息
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
    
    // 隐藏视频预览，显示封面图
    this.setData({
      showVideoPreview: false
    })
    
    // 如果视频链接已失效，提示用户重新解析
    if (e.detail && e.detail.errMsg && e.detail.errMsg.includes('Failed to load')) {
      // 可以在这里添加重新解析的逻辑
      console.log('视频链接已失效，需要重新解析')
    }
  },

  // 打开视频
  openVideo: function() {
    if (!this.data.videoData || !this.data.videoData.url) {
      wx.showToast({
        title: '视频链接无效',
        icon: 'none'
      })
      return
    }
    
    // 尝试打开视频
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
    // 页面卸载时清除定时器
    if (this.data.updateTimer) {
      clearInterval(this.data.updateTimer)
    }
    
    // 清理视频上下文
    if (this.videoContext) {
      this.videoContext = null
    }
  },
  
  // 页面隐藏时调用
  onHide: function() {
  },
  
  // 页面显示时调用
  onShow: function() {
    // 确保导航栏颜色正确，避免旧样式显示
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: '#FF6B35'
    })
  },

  // 分享给好友
  onShareAppMessage: function() {
    return {
      title: this.data.videoData ? this.data.videoData.title : '短视频无水印下载',
      path: '/pages/index/index',
      imageUrl: '/images/12.png'
    }
  },

  // 分享到朋友圈
  onShareTimeline: function() {
    return {
      title: '短视频无水印下载',
      query: '',
      imageUrl: '/images/12.png'
    }
  },

  // 获取通知内容
  getNoticeContent: function() {
    api.request('api.php?action=get_notice')
      .then(res => {
        if (res.success && res.data && res.data.content) {
          // 检查内容是否发生变化
          if (res.data.content !== this.data.noticeContent) {
            this.setData({
              noticeContent: res.data.content
            })
          }
        }
      })
      .catch(err => {
        // 失败时使用默认内容，不显示错误提示
      })
  },

  // 获取公告内容
  getAnnouncementContent: function() {
    api.request('api.php?action=get_announcement')
      .then(res => {
        if (res.success && res.data && res.data.content) {
          // 检查内容是否发生变化
          if (res.data.content !== this.data.announcementContent) {
            this.setData({
              announcementContent: res.data.content
            })
          }
        }
      })
      .catch(err => {
        // 失败时使用默认内容，不显示错误提示
      })
  },

  // 跳转到个人中心页面
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

  // 显示客服提示
  showCustomerServiceTip: function() {
    // 使用 open-type="contact" 的按钮会自动处理客服功能
    // 这里只需要处理失败情况
    console.log('客服按钮被点击');
  }
})