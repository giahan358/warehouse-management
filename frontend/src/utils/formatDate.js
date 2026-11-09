import dayjs from 'dayjs'

export const formatDate = (d) => (d ? dayjs(d).format('DD/MM/YYYY') : '—')
export const formatDateTime = (d) => (d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '—')
