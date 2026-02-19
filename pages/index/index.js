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
    updateTimer: null, // 定时器ID
    adLoading: false, // 广告加载状态
    videoAdUnitId: '', // 激励视频广告位ID，需要替换为实际的广告位ID
    rewardAd: null, // 激励视频广告实例
    interstitialAdUnitId: '', // 插屏广告位ID，需要替换为实际的广告位ID
    interstitialAd: null, // 插屏广告实例
    interstitialAdTimer: null // 插屏广告定时器
  },

  onLoad: function (options) {
    // 立即设置页面样式，避免闪烁
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: '#1a1d29'
    })
    
    // 延迟初始化，确保组件框架完全加载
    setTimeout(() => {
      // 获取窗口信息，包括状态栏高度
      const windowInfo = wx.getWindowInfo()
      // 只更新需要的数据，避免不必要的渲染
      if (windowInfo.statusBarHeight !== this.data.statusBarHeight) {
        this.setData({
          statusBarHeight: windowInfo.statusBarHeight
        })
      }
      
      // 获取平台信息
      const app = getApp()
      this.setData({
        isHarmonyOS: app.globalData.isHarmonyOS
      })
      
      // 计算导航栏总高度（状态栏高度 + 导航栏内容高度）
      const navbarTotalHeight = windowInfo.statusBarHeight + 44
      
      // 设置公告栏的位置，确保紧贴导航栏
      this.setData({
        announcementBarTop: navbarTotalHeight
      })
      
      // 获取通知和公告内容
      this.getNoticeContent()
      this.getAnnouncementContent()
      
      // 设置定时器，每5秒获取一次最新数据
      this.data.updateTimer = setInterval(() => {
        this.getNoticeContent()
        this.getAnnouncementContent()
      }, 5000)
      
      // 初始化激励视频广告
      this.initRewardAd()
      
      // 初始化插屏广告
      this.initInterstitialAd()
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
    // 基础字段 - 适配新的API返回结构
    let videoUrl = data.video || data.url || data.video_url || ''
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

  // 初始化激励视频广告
  initRewardAd: function() {
    if (!wx.createRewardedVideoAd) {
      console.error('当前微信版本不支持激励视频广告')
      return
    }
    
    try {
      // 销毁旧的广告实例（如果存在）
      if (this.data.rewardAd) {
        try {
          this.data.rewardAd.offLoad && this.data.rewardAd.offLoad()
          this.data.rewardAd.offError && this.data.rewardAd.offError()
          this.data.rewardAd.offClose && this.data.rewardAd.offClose()
        } catch (e) {
          console.error('销毁旧广告实例时出错:', e)
        }
      }
      
      // 创建激励视频广告实例
      const rewardAd = wx.createRewardedVideoAd({
        adUnitId: this.data.videoAdUnitId,
        multiton: false // 确保每次都是新的广告实例
      })
      
      this.setData({
        rewardAd: rewardAd
      })
      
      // 监听广告加载事件
      rewardAd.onLoad(() => {
        console.log('激励视频广告加载成功')
      })
      
      // 监听广告错误事件
      rewardAd.onError((err) => {
        console.error('激励视频广告加载失败:', err)
        this.setData({
          adLoading: false
        })
      })
      
      // 监听广告关闭事件
      rewardAd.onClose((status) => {
        this.setData({
          adLoading: false
        })
        
        if (status && status.isEnded || status === undefined) {
          // 用户看完广告，可以发放奖励
          this.doParseVideo()
        } else {
          // 用户没看完广告，不发放奖励
          wx.showToast({
            title: '需要完整观看广告才能使用去水印功能',
            icon: 'none',
            duration: 2000
          })
        }
      })
      
      // 延迟预加载广告，确保广告实例完全初始化
      setTimeout(() => {
        if (this.data && this.data.rewardAd === rewardAd) {
          rewardAd.load().catch(err => {
            console.log('预加载广告失败，将在使用时重新加载:', err)
          })
        }
      }, 500)
      
    } catch (err) {
      console.error('创建激励视频广告实例失败:', err)
      this.setData({
        adLoading: false
      })
    }
  },
  
  // 显示激励视频广告
  showRewardAd: function() {
    // 检查页面是否还在显示中
    if (!this.data || !this.data.videoUrl) {
      return
    }
    
    if (!this.data.rewardAd) {
      // 如果广告实例不存在，尝试重新创建
      this.initRewardAd()
      
      if (!this.data.rewardAd) {
        wx.showToast({
          title: '广告初始化失败',
          icon: 'none'
        })
        return
      }
    }
    
    this.setData({
      adLoading: true
    })
    
    // 延迟一小段时间，确保页面渲染完成
    setTimeout(() => {
      // 再次检查页面状态
      if (!this.data || !this.data.videoUrl) {
        this.setData({
          adLoading: false
        })
        return
      }
      
      // 尝试加载并显示广告
      this.loadAndShowAd(0)
    }, 300)
  },
  
  // 加载并显示广告，支持重试
  loadAndShowAd: function(retryCount) {
    const maxRetries = 2 // 最大重试次数
    
    // 再次检查页面和广告实例状态
    if (!this.data || !this.data.rewardAd || !this.data.videoUrl) {
      this.setData({
        adLoading: false
      })
      return
    }
    
    // 先加载广告数据
    this.data.rewardAd.load()
      .then(() => {
        // 再次检查页面状态
        if (!this.data || !this.data.rewardAd || !this.data.videoUrl) {
          this.setData({
            adLoading: false
          })
          return
        }
        
        // 加载成功后显示广告
        return this.data.rewardAd.show()
      })
      .catch((err) => {
        console.error(`激励视频广告加载或显示失败 (尝试 ${retryCount + 1}/${maxRetries + 1}):`, err)
        
        // 如果还有重试机会，则重试
        if (retryCount < maxRetries) {
          // 延迟一段时间后重试
          setTimeout(() => {
            // 再次检查页面状态
            if (!this.data || !this.data.videoUrl) {
              this.setData({
                adLoading: false
              })
              return
            }
            
            // 重新创建广告实例
            this.initRewardAd()
            
            // 再次延迟后重试
            setTimeout(() => {
              this.loadAndShowAd(retryCount + 1)
            }, 500)
          }, 1000)
        } else {
          // 重试次数用完，显示降级选项
          this.setData({
            adLoading: false
          })
          
          wx.showModal({
            title: '提示',
            content: '广告暂时无法加载，是否直接使用去水印功能？',
            confirmText: '直接使用',
            cancelText: '重试',
            success: (res) => {
              if (res.confirm) {
                this.doParseVideo()
              } else {
                // 用户选择重试
                this.showRewardAd()
              }
            }
          })
        }
      })
  },
  
  // 解析视频（不含广告逻辑）
  doParseVideo: function() {
    let videoUrl = this.data.videoUrl.trim()
    if (!videoUrl) {
      this.setData({ error: '请输入视频链接' })
      return
    }

    // 显示加载状态
    this.setData({
      loading: true,
      error: '',
      videoData: null
    })

    // 调用统一解析API
    api.parseVideo(videoUrl)
      .then(res => {
        // 检查API返回的数据是否有效
        if (!res || !res.data) {
          throw new Error('未找到有效媒体信息')
        }
        
        // 标准化数据结构
        const videoData = this.normalizeVideoData(res.data, 'unknown')
        
        this.setData({
          loading: false,
          videoData,
          showVideoPreview: false // 重置视频预览状态
        })
        
        // 设置定时器，0.5秒后显示插屏广告
        this.data.interstitialAdTimer = setTimeout(() => {
          this.showInterstitialAd()
        }, 500)
      })
      .catch(err => {
        let errorMessage = '解析失败，请检查链接是否正确或稍后重试'
        
        // 根据错误类型提供更具体的错误信息
        if (err) {
          // 优先检查错误代码
          if (err.code === 1002 || err.code === 1001) {
            errorMessage = '未找到有效媒体信息，请检查链接是否为有效的短视频链接'
          }
          // 处理会员等级不足的错误
          else if (err.code === 1005) {
            errorMessage = '会员等级不足，请联系开通会员或者升级会员等级'
          }
          // 处理次数不足的错误
          else if (err.code === 1004) {
            errorMessage = '次数不足，请升级VIP等级或明天再试'
          }
          // 处理API返回的错误消息
          else if (err.message && err.message.includes('未找到有效媒体信息')) {
            errorMessage = '未找到有效媒体信息，请检查链接是否为有效的短视频链接'
          } else if (err.message && err.message.includes('网络请求失败')) {
            errorMessage = '网络请求失败，请检查网络连接后重试'
          } else if (err.message && err.message.includes('请求失败')) {
            errorMessage = '服务器请求失败，请稍后重试'
          } else if (err.message) {
            errorMessage = err.message
          }
        }
        
        this.setData({
          loading: false,
          error: errorMessage
        })
      })
  },

  // 解析视频（含广告逻辑）
  parseVideo: function() {
    // 检查输入是否为空
    let videoUrl = this.data.videoUrl.trim()
    if (!videoUrl) {
      this.setData({ error: '请输入视频链接' })
      return
    }

    // 尝试从文本中提取视频链接
    const extractedUrl = this.extractVideoUrl(videoUrl)
    if (extractedUrl) {
      videoUrl = extractedUrl
      // 立即更新输入框中的值为提取的纯净链接
      this.setData({ videoUrl })
    }

    // 立即清空上一次的解析结果
    this.setData({
      videoData: null,
      error: '',
      showLink: false,
      showVideoPreview: false
    })

    // 显示激励视频广告
    this.showRewardAd()
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
      wx.hideLoading()
      wx.showToast({
        title: '视频链接格式错误',
        icon: 'none'
      })
      return
    }
    
    wx.showLoading({
      title: '准备下载...',
    })
    
    // 下载文件
    wx.downloadFile({
      url: downloadUrl,
      success: (res) => {
        wx.hideLoading()
        
        if (res.statusCode === 200) {
          // 下载成功，保存到本地
          const tempFilePath = res.tempFilePath
          
          // 获取视频标题作为文件名
          const title = '短视频' // 使用固定标题，因为不再显示视频标题
          // 清理文件名中的特殊字符
          const fileName = title.replace(/[^\w\u4e00-\u9fa5]/g, '_').substring(0, 20) + '.mp4'
          
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
                // 如果保存到相册失败，尝试打开文件
                wx.openDocument({
                  filePath: tempFilePath,
                  success: () => {
                    wx.showToast({
                      title: '已打开文件',
                      icon: 'success'
                    })
                  },
                  fail: () => {
                    wx.showModal({
                      title: '下载失败',
                      content: '无法保存视频到相册，也无法打开文件',
                      showCancel: false
                    })
                  }
                })
              }
            }
          })
        } else {
          wx.showToast({
            title: '下载失败',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        wx.hideLoading()
        
        wx.showModal({
          title: '下载失败',
          content: '视频下载失败，可复制链接到手机浏览器里粘贴连接下载！！！',
          confirmText: '复制链接',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              // 如果下载失败，提供复制链接的备选方案
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
    
    // 清除插屏广告定时器
    if (this.data.interstitialAdTimer) {
      clearTimeout(this.data.interstitialAdTimer)
      this.data.interstitialAdTimer = null
    }
    
    // 销毁激励视频广告实例
    this.destroyAd()
    
    // 清理视频上下文
    if (this.videoContext) {
      this.videoContext = null
    }
  },
  
  // 页面隐藏时调用
  onHide: function() {
    // 页面隐藏时，停止广告加载
    if (this.data.adLoading) {
      this.setData({
        adLoading: false
      })
    }
    
    // 清除插屏广告定时器
    if (this.data.interstitialAdTimer) {
      clearTimeout(this.data.interstitialAdTimer)
      this.data.interstitialAdTimer = null
    }
  },
  
  // 页面显示时调用
  onShow: function() {
    // 确保导航栏颜色正确，避免旧样式显示
    wx.setNavigationBarColor({
      frontColor: '#ffffff',
      backgroundColor: '#1a1d29'
    })
    
    // 页面显示时，可以重新初始化广告
    if (!this.data.rewardAd) {
      this.initRewardAd()
    }
  },
  
  // 初始化插屏广告
  initInterstitialAd: function() {
    console.log('开始初始化插屏广告，广告位ID:', this.data.interstitialAdUnitId)
    
    if (!wx.createInterstitialAd) {
      console.error('当前微信版本不支持插屏广告')
      return
    }
    
    try {
      // 销毁旧的插屏广告实例（如果存在）
      if (this.data.interstitialAd) {
        try {
          this.data.interstitialAd.offLoad && this.data.interstitialAd.offLoad()
          this.data.interstitialAd.offError && this.data.interstitialAd.offError()
          this.data.interstitialAd.offClose && this.data.interstitialAd.offClose()
        } catch (e) {
          console.error('销毁旧插屏广告实例时出错:', e)
        }
      }
      
      // 创建插屏广告实例
      const interstitialAd = wx.createInterstitialAd({
        adUnitId: this.data.interstitialAdUnitId
      })
      
      this.setData({
        interstitialAd: interstitialAd
      })
      
      console.log('插屏广告实例创建成功')
      
      // 监听插屏广告加载事件
      interstitialAd.onLoad(() => {
        console.log('插屏广告预加载成功')
      })
      
      // 监听插屏广告错误事件
      interstitialAd.onError((err) => {
        console.error('插屏广告加载失败:', err)
        // 检查是否是广告位ID错误
        if (err.errMsg && err.errMsg.includes('ad unit not exist')) {
          console.error('错误：广告位ID不存在，请检查广告位ID是否正确')
        }
      })
      
      // 监听插屏广告关闭事件
      interstitialAd.onClose(() => {
        console.log('插屏广告已关闭')
      })
      
      // 延迟预加载插屏广告，确保广告实例完全初始化
      setTimeout(() => {
        if (this.data && this.data.interstitialAd === interstitialAd) {
          console.log('开始预加载插屏广告')
          interstitialAd.load().then(() => {
            console.log('插屏广告预加载完成')
          }).catch(err => {
            console.log('预加载插屏广告失败，将在使用时重新加载:', err)
          })
        }
      }, 500)
      
    } catch (err) {
      console.error('创建插屏广告实例失败:', err)
    }
  },
  
  // 显示插屏广告
  showInterstitialAd: function() {
    console.log('准备显示插屏广告')
    
    // 检查页面是否还在显示中
    if (!this.data || !this.data.videoData) {
      console.log('页面或视频数据不存在，不显示插屏广告')
      return
    }
    
    if (!this.data.interstitialAd) {
      console.log('插屏广告实例不存在，尝试重新创建')
      // 如果广告实例不存在，尝试重新创建
      this.initInterstitialAd()
      
      if (!this.data.interstitialAd) {
        console.error('插屏广告初始化失败')
        return
      }
    }
    
    console.log('开始加载插屏广告')
    
    // 加载并显示插屏广告
    this.data.interstitialAd.load()
      .then(() => {
        console.log('插屏广告加载成功，准备显示')
        
        // 再次检查页面状态
        if (!this.data || !this.data.videoData) {
          console.log('页面或视频数据不存在，不显示插屏广告')
          return
        }
        
        // 显示插屏广告
        this.data.interstitialAd.show()
          .then(() => {
            console.log('插屏广告显示成功')
          })
          .catch((err) => {
            console.error('插屏广告显示失败:', err)
            
            // 尝试使用降级方案
            this.showFallbackAd()
          })
      })
      .catch((err) => {
        console.error('插屏广告加载失败:', err)
        
        // 尝试使用降级方案
        this.showFallbackAd()
      })
  },
  
  // 降级广告方案
  showFallbackAd: function() {
    console.log('尝试使用降级广告方案')
    
    // 尝试重新创建广告实例并显示
    try {
      // 销毁旧实例
      if (this.data.interstitialAd) {
        this.data.interstitialAd.offLoad && this.data.interstitialAd.offLoad()
        this.data.interstitialAd.offError && this.data.interstitialAd.offError()
        this.data.interstitialAd.offClose && this.data.interstitialAd.offClose()
      }
      
      // 创建新实例
      const interstitialAd = wx.createInterstitialAd({
        adUnitId: this.data.interstitialAdUnitId
      })
      
      this.setData({
        interstitialAd: interstitialAd
      })
      
      // 设置事件监听
      interstitialAd.onLoad(() => {
        console.log('降级方案：插屏广告加载成功')
        interstitialAd.show().catch(err => {
          console.error('降级方案：插屏广告显示失败', err)
        })
      })
      
      interstitialAd.onError((err) => {
        console.error('降级方案：插屏广告加载失败', err)
      })
      
      interstitialAd.onClose(() => {
        console.log('降级方案：插屏广告已关闭')
      })
      
      // 尝试加载
      interstitialAd.load()
      
    } catch (err) {
      console.error('降级广告方案也失败了', err)
    }
  },
  
  // 销毁广告实例的通用方法
  destroyAd: function() {
    // 销毁激励视频广告实例
    if (this.data.rewardAd) {
      try {
        this.data.rewardAd.offLoad && this.data.rewardAd.offLoad()
        this.data.rewardAd.offError && this.data.rewardAd.offError()
        this.data.rewardAd.offClose && this.data.rewardAd.offClose()
      } catch (e) {
        console.error('销毁激励视频广告实例时出错:', e)
      }
      this.data.rewardAd = null
    }
    
    // 销毁插屏广告实例
    if (this.data.interstitialAd) {
      try {
        this.data.interstitialAd.offLoad && this.data.interstitialAd.offLoad()
        this.data.interstitialAd.offError && this.data.interstitialAd.offError()
        this.data.interstitialAd.offClose && this.data.interstitialAd.offClose()
      } catch (e) {
        console.error('销毁插屏广告实例时出错:', e)
      }
      this.data.interstitialAd = null
    }
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

  // 显示客服提示
  showCustomerServiceTip: function() {
    // 使用 open-type="contact" 的按钮会自动处理客服功能
    // 这里只需要处理失败情况
    console.log('客服按钮被点击');
  }
})