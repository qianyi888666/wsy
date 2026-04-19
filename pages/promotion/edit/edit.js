const api = require('../../../utils/api.js')
const auth = require('../../../utils/auth.js')

Page({
  data: {
    formData: {
      id: null,
      title: '',
      description: '',
      link: '',
      cover_image: ''
    },
    submitting: false,
    userId: null,
    userToken: null,
    isEdit: false,
    inputFocus: {
      title: false,
      description: false,
      link: false
    }
  },

  onLoad: function(options) {
    const userId = auth.getUserId()
    const userToken = auth.getUserToken()
    
    if (!userId || !userToken) {
      wx.showModal({
        title: '提示',
        content: '请先登录后再操作',
        showCancel: false,
        success: () => {
          wx.navigateBack()
        }
      })
      return
    }

    this.setData({ 
      userId, 
      userToken,
      inputFocus: {
        title: false,
        description: false,
        link: false
      }
    })

    if (options.id) {
      wx.setNavigationBarTitle({ title: '编辑推广' })
      this.setData({
        'formData.id': parseInt(options.id),
        isEdit: true
      })
      this.loadPromotionDetail(options.id)
    }
  },

  loadPromotionDetail: function(id) {
    wx.showLoading({ title: '加载中...' })
    
    api.getPromotionDetail({ id: id }).then(res => {
      wx.hideLoading()
      const data = res.data
      
      this.setData({
        formData: {
          id: data.id,
          title: data.title || '',
          description: data.description || '',
          link: data.link || '',
          cover_image: data.cover_image || ''
        }
      })
    }).catch(err => {
      wx.hideLoading()
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      })
    })
  },

  onTitleInput: function(e) {
    this.setData({ 'formData.title': e.detail.value })
  },

  onTitleFocus: function() {
    this.setData({ 'inputFocus.title': true })
  },

  onTitleBlur: function(e) {
    this.setData({ 'inputFocus.title': false })
  },

  onDescriptionInput: function(e) {
    this.setData({ 'formData.description': e.detail.value })
  },

  onDescriptionFocus: function() {
    this.setData({ 'inputFocus.description': true })
  },

  onDescriptionBlur: function(e) {
    this.setData({ 'inputFocus.description': false })
  },

  onLinkInput: function(e) {
    this.setData({ 'formData.link': e.detail.value })
  },

  onLinkFocus: function() {
    this.setData({ 'inputFocus.link': true })
  },

  onLinkBlur: function(e) {
    this.setData({ 'inputFocus.link': false })
  },

  handleTap: function(e) {
    const action = e.currentTarget.dataset.action
    if (action && this[action]) {
      this[action]()
    }
  },

  chooseImage: function() {
    const that = this
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: function(res) {
        that.uploadImage(res.tempFiles[0].tempFilePath)
      },
      fail: function(err) {
        wx.showToast({
          title: '选择图片失败: ' + (err.errMsg || '未知错误'),
          icon: 'none'
        })
      }
    })
  },

  onChooseImageTap: function() {
  },

  onChooseImage: function(e) {
    if (e.detail && e.detail.tempFilePaths && e.detail.tempFilePaths.length > 0) {
      this.uploadImage(e.detail.tempFilePaths[0])
    }
  },

  uploadImage: function(filePath) {
    wx.showLoading({ title: '上传中...' })
    
    api.uploadPromotionImage(filePath).then(res => {
      wx.hideLoading()
      this.setData({ 'formData.cover_image': res.data.image_url })
    }).catch(err => {
      wx.hideLoading()
      wx.showToast({
        title: err.message || '上传失败',
        icon: 'none'
      })
    })
  },

  onSubmit: function() {
    const { formData, submitting, userToken } = this.data

    if (submitting) return

    if (!formData.title.trim()) {
      wx.showToast({ title: '请输入标题', icon: 'none' })
      return
    }

    if (!formData.link.trim()) {
      wx.showToast({ title: '请输入小程序链接', icon: 'none' })
      return
    }

    const link = formData.link.trim()
    if (!link.startsWith('#小程序://')) {
      wx.showToast({ title: '请输入正确的小程序链接，格式：#小程序://xxx/xxx', icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    const requestData = {
      user_token: userToken,
      title: formData.title.trim(),
      description: formData.description.trim(),
      link: link,
      cover_image: formData.cover_image
    }

    if (formData.id) {
      requestData.id = formData.id
      api.updatePromotion(requestData).then(() => {
        wx.showModal({
          title: '修改成功',
          content: '扣除1积分',
          showCancel: false,
          confirmText: '知道了',
          success: () => {
            wx.navigateBack()
          }
        })
      }).catch(err => {
        this.setData({ submitting: false })
        
        let errorMessage = err.message || '修改失败'
        
        if (err.code === 1003) {
          errorMessage = err.message || '内容包含违规信息，请修改后重试'
        }
        
        wx.showToast({
          title: errorMessage,
          icon: 'none'
        })
      })
    } else {
      api.publishPromotion(requestData).then(() => {
        wx.showModal({
          title: '发布成功',
          content: '发布成功，扣除3点积分',
          showCancel: false,
          success: () => {
            wx.navigateBack()
          }
        })
      }).catch(err => {
        this.setData({ submitting: false })
        
        let errorMessage = err.message || err.msg || '发布失败'
        
        if (err.code === 1003) {
          errorMessage = err.message || '内容包含违规信息，请修改后重试'
        }
        
        wx.showToast({
          title: errorMessage,
          icon: 'none'
        })
      })
    }
  }
})