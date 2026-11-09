import { Modal } from 'antd'

export default function ConfirmModal({ open, title, content, onOk, onCancel, danger }) {
  return (
    <Modal
      open={open}
      title={title}
      onOk={onOk}
      onCancel={onCancel}
      okText="Xác nhận"
      cancelText="Hủy"
      okButtonProps={{ danger }}
    >
      {content}
    </Modal>
  )
}
