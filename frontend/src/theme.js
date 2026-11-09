// Theme Ant Design khớp design system của Stitch (DESIGN.md)
const theme = {
  token: {
    colorPrimary: '#0057c2',
    colorInfo: '#0057c2',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ba1a1a',
    colorBgLayout: '#f8f9ff',
    colorBgContainer: '#ffffff',
    colorText: '#0b1c30',
    colorTextSecondary: '#414755',
    colorBorder: '#c1c6d7',
    colorBorderSecondary: '#e5eeff',
    borderRadius: 6,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,
  },
  components: {
    Table: {
      headerBg: '#eff4ff',
      headerColor: '#414755',
      rowHoverBg: '#f8f9ff',
      rowSelectedBg: '#e6f0ff',
      borderColor: '#e5eeff',
    },
    Layout: { siderBg: '#ffffff', headerBg: '#ffffff', bodyBg: '#f8f9ff' },
    Menu: {
      itemSelectedBg: '#0057c2',
      itemSelectedColor: '#ffffff',
      itemHoverBg: '#eff4ff',
      itemBorderRadius: 6,
    },
    Card: { borderRadiusLG: 8 },
  },
}

export default theme
