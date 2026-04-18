const api = require('../../../utils/api.js')
const auth = require('../../../utils/auth.js')

Page({
  data: {
    myPromotions: [],
    page: 1,
    limit: 20,
    hasMore: true,
    loading: false,
    userId: null,
    userToken: null
  },

  onLoad: function(options) {
    this.getUserInfo()
  },

  onShow: function() {
    if (this.data.userId) {
      this.loadMyPromotions()
    }
  },

  getUserInfo: function() {
    const userId = auth.getUserId()
    const userToken = auth.getUserToken()
    
    if (userId && userToken) {
      this.setData({ userId, userToken })
      this.loadMyPromotions()
    } else {
      wx.showModal({
        title: '提示',
        content: '请先登录后再查看',
        showCancel: false,
        success: () => {
          wx.switchTab({ url: '/pages/profile/profile' })
        }
      })
    }
  },

  loadMyPromotions: function() {
    if (this.data.loading || !this.data.userToken) return

    this.setData({ loading: true })

    api.getMyPromotions({ user_token: this.data.userToken }).then(res => {
      this.setData({
        myPromotions: res.data || [],
        loading: false
      })
    }).catch(err => {
      this.setData({ loading: false })
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      })
    })
  },

  onLoadMore: function() {
    
  },

  onPullDownRefresh: function() {
    this.loadMyPromotions()
    wx.stopPullDownRefresh()
  },

  goToPublish: function() {
    wx.navigateTo({
      url: '/pages/promotion/edit/edit'
    })
  },

  editPromotion: function(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/promotion/edit/edit?id=${id}`
    })
  },

  toggleStatus: function(e) {
    const id = e.currentTarget.dataset.id
    const currentStatus = e.currentTarget.dataset.status
    const newStatus = currentStatus == 1 ? 0 : 1

    wx.showModal({
      title: '提示',
      content: newStatus == 1 ? '确定要上架该推广吗？' : '确定要下架该推广吗？',
      success: (res) => {
        if (res.confirm) {
          api.togglePromotionStatus({
            id: id,
            status: newStatus,
            user_token: this.data.userToken
          }).then(() => {
            wx.showToast({
              title: newStatus == 1 ? '上架成功' : '下架成功',
              icon: 'success'
            })
            this.loadMyPromotions()
          }).catch(err => {
            wx.showToast({
              title: err.message || '操作失败',
              icon: 'none'
            })
          })
        }
      }
    })
  },

  deletePromotion: function(e) {
    const id = e.currentTarget.dataset.id

    wx.showModal({
      title: '确认删除',
      content: '确定要删除该推广吗？此操作不可恢复',
      success: (res) => {
        if (res.confirm) {
          api.deletePromotion({
            id: id,
            user_token: this.data.userToken
          }).then(() => {
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })
            this.loadMyPromotions()
          }).catch(err => {
            wx.showToast({
              title: err.message || '删除失败',
              icon: 'none'
            })
          })
        }
      }
    })
  },

  onReachBottom: function() {
    this.onLoadMore()
  }
})