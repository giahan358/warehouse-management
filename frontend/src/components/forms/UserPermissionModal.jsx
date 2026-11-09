import { useEffect, useState } from 'react'
import { Avatar, Button, Checkbox, Modal, message } from 'antd'
import { SafetyCertificateOutlined } from '@ant-design/icons'
import userApi from '../../api/userApi'
import PopupHeader, { modalStyles } from '../common/PopupHeader'
import { permissionScopesMock } from '../../mocks/popupData'

// Modal "Cấu hình quyền & chính sách bảo vệ Tenant" — PATCH /users/{id}/roles
export default function UserPermissionModal({ open, user, onClose, onSaved }) {
  const scopes = user ? permissionScopesMock[user.role] ?? [] : []
  const [checked, setChecked] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setChecked(Object.fromEntries(scopes.map((s) => [s.key, !!s.checked])))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user])

  const handleSave = async () => {
    setSaving(true)
    try {
      const granted = scopes.filter((s) => checked[s.key]).map((s) => s.key)
      await userApi.updatePermissions(user.id, granted)
      message.success(`Đã cập nhật phân quyền cho ${user.name}`)
      onSaved?.(user, granted)
      onClose()
    } catch (e) {
      message.error(e?.response?.data?.message ?? 'Không thể lưu phân quyền')
    } finally {
      setSaving(false)
    }
  }

  const initials = user?.name.split(' ').slice(-2).map((w) => w[0]).join('')

  return (
    <Modal open={open} onCancel={onClose} width={620} centered styles={modalStyles}
      title={<PopupHeader icon={<SafetyCertificateOutlined />} title="Cấu hình Quyền & Chính sách Bảo vệ Tenant" />}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={onClose}>Hủy bỏ</Button>
          <Button type="primary" loading={saving} onClick={handleSave}>Lưu thay đổi phân quyền (PATCH /users/{user?.id}/roles)</Button>
        </div>
      }>
      {user && (
        <>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#eff4ff', borderRadius: 8, padding: 14, marginBottom: 16 }}>
            <Avatar size={44} style={{ background: '#dce9ff', color: '#0057c2', fontWeight: 600 }}>{initials}</Avatar>
            <div style={{ lineHeight: 1.4 }}>
              <b style={{ fontSize: 15 }}>{user.name}</b> <span className="chip">ROLE_{user.role}</span>
              <div className="text-muted">
                {user.role === 'CUSTOMER' ? 'Doanh nghiệp' : 'Đơn vị'}: {user.org} (Mã định danh: {user.id})
              </div>
            </div>
          </div>

          <div style={{ fontWeight: 600, marginBottom: 8 }}>Phạm vi dữ liệu cho phép (Tenant Scope)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {scopes.map((s) => (
              <Checkbox key={s.key} disabled={s.disabled} checked={!!checked[s.key]}
                onChange={(e) => setChecked((c) => ({ ...c, [s.key]: e.target.checked }))}>
                {s.label}
              </Checkbox>
            ))}
          </div>
        </>
      )}
    </Modal>
  )
}
