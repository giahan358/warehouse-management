import { useCallback, useEffect, useState } from 'react';
import { BankOutlined, CheckCircleOutlined, SaveOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  message,
  Progress,
  Row,
  Statistic,
  Tabs,
  Typography,
} from 'antd';
import { customerApi, getApiErrorMessage } from '../../api/customerPortalApi';
import ApiPanel from '../../components/common/ApiPanel';
import CustomerPageHeader from '../../components/common/CustomerPageHeader';
import useApiData from '../../utils/useApiData';
import { formatNumber } from '../../utils/customerFormatters';

export default function ProfilePage() {
  const [form] = Form.useForm();
  const [busy, setBusy] = useState(false);
  const loadProfile = useCallback(() => customerApi.profile.get(), []);
  const profile = useApiData(loadProfile);

  useEffect(() => {
    if (profile.data) form.setFieldsValue(profile.data);
  }, [form, profile.data]);

  const saveProfile = async (values) => {
    setBusy(true);
    try {
      await customerApi.profile.update({
        businessName: values.businessName,
        phone: values.phone,
        address: values.address,
        legalRepresentative: values.legalRepresentative || undefined,
        billingEmail: values.billingEmail || undefined,
        bankName: values.bankName || undefined,
        bankAccountNumber: values.bankAccountNumber || undefined,
        bankAccountHolder: values.bankAccountHolder || undefined,
      });
      message.success('Đã lưu hồ sơ doanh nghiệp.');
      profile.reload();
    } catch (error) {
      message.error(getApiErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const profileTabs = [
    {
      key: 'business',
      label: '1. Thông tin doanh nghiệp & Liên hệ',
      children: (
        <Row gutter={[16, 8]}>
          <Col xs={24} md={12}>
            <Form.Item name="businessName" label="Tên doanh nghiệp" rules={[{ required: true, message: 'Vui lòng nhập tên doanh nghiệp.' }, { max: 200 }]}>
              <Input maxLength={200} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="taxCode" label="Mã số thuế">
              <Input disabled />
            </Form.Item>
            <Typography.Text className="field-help">Mã số thuế cần được cập nhật theo quy trình hỗ trợ khách hàng.</Typography.Text>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="legalRepresentative" label="Người đại diện pháp luật">
              <Input maxLength={150} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="phone" label="Số điện thoại doanh nghiệp" rules={[{ required: true }, { max: 20 }]}>
              <Input maxLength={20} />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="address" label="Địa chỉ doanh nghiệp" rules={[{ required: true }, { max: 500 }]}>
              <Input.TextArea rows={2} maxLength={500} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="billingEmail" label="Email nhận hóa đơn">
              <Input type="email" maxLength={255} />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
    {
      key: 'bank',
      label: '2. Tài khoản ngân hàng đối soát COD',
      children: (
        <Row gutter={[16, 8]}>
          <Col xs={24} md={8}><Form.Item name="bankName" label="Ngân hàng"><Input maxLength={100} /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="bankAccountNumber" label="Số tài khoản"><Input maxLength={30} /></Form.Item></Col>
          <Col xs={24} md={8}><Form.Item name="bankAccountHolder" label="Chủ tài khoản"><Input maxLength={150} /></Form.Item></Col>
          <Col span={24}><Alert type="info" showIcon title="Thông tin tài khoản được dùng cho việc đối soát tiền thu hộ (COD)." /></Col>
        </Row>
      ),
    },
  ];

  return (
    <>
      <CustomerPageHeader
        title="Hồ sơ Doanh nghiệp & Tài khoản"
        subtitle="Quản lý thông tin pháp lý, địa chỉ liên hệ và tài khoản nhận tiền thu hộ."
        breadcrumb={['Trang chủ', 'Tài khoản', 'Hồ sơ doanh nghiệp']}
      />
      <ApiPanel loading={profile.loading} error={profile.error} onRetry={profile.reload}>
        {profile.data && (
          <>
            <Row gutter={[12, 12]} className="profile-summary">
              <Col xs={24} xl={10}>
                <Card className="profile-business-card" variant="borderless">
                  <div className="profile-company-heading">
                    <span className="profile-company-icon"><BankOutlined /></span>
                    <div><Typography.Title level={4}>{profile.data.businessName}</Typography.Title><Typography.Text type="secondary">{profile.data.customerCode}</Typography.Text></div>
                  </div>
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Người đại diện">{profile.data.legalRepresentative || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Email đăng nhập">{profile.data.email || '—'}</Descriptions.Item>
                    <Descriptions.Item label="Gói dịch vụ">{profile.data.servicePackage || '—'}</Descriptions.Item>
                  </Descriptions>
                </Card>
              </Col>
              <Col xs={24} xl={14}>
                <Card className="capacity-profile-card" variant="borderless">
                  <div className="capacity-profile-heading">
                    <div><Typography.Text type="secondary">TÌNH TRẠNG TÀI NGUYÊN LƯU TRỮ</Typography.Text><Typography.Title level={5}>Hạn mức thể tích & Sử dụng thực tế</Typography.Title></div>
                    <Typography.Text strong>{formatNumber(profile.data.usedM3, 2)} / {formatNumber(profile.data.capacityM3, 2)} m³</Typography.Text>
                  </div>
                  {profile.data.usedPercent == null ? <Typography.Text type="secondary">Chưa có tỷ lệ sử dụng từ hệ thống.</Typography.Text> : <Progress percent={Number(profile.data.usedPercent)} />}
                  <Row gutter={8}>
                    <Col span={8}><Statistic title="Đang lưu trữ" value={profile.data.usedM3 ?? '—'} suffix="m³" /></Col>
                    <Col span={8}><Statistic title="Giữ chỗ trước" value={profile.data.reservedInboundM3 ?? '—'} suffix="m³" /></Col>
                    <Col span={8}><Statistic title="Dung lượng còn" value={profile.data.remainingM3 ?? '—'} suffix="m³" /></Col>
                  </Row>
                </Card>
              </Col>
            </Row>
            <Card className="customer-data-card profile-form-card" variant="borderless">
              <div className="profile-policy"><CheckCircleOutlined /> Thông tin định danh doanh nghiệp được đồng bộ theo hồ sơ khách hàng. Mã số thuế, gói dịch vụ và hạn mức do hệ thống quản lý.</div>
              <Form form={form} layout="vertical" onFinish={saveProfile}>
                <Tabs items={profileTabs} />
                <div className="profile-form-footer">
                  <Typography.Text type="secondary">Các thay đổi hồ sơ được gửi lên hệ thống để lưu và kiểm tra.</Typography.Text>
                  <SpaceButtons busy={busy} onCancel={() => form.setFieldsValue(profile.data)} />
                </div>
              </Form>
            </Card>
          </>
        )}
      </ApiPanel>
    </>
  );
}

function SpaceButtons({ busy, onCancel }) {
  return (
    <div className="profile-buttons">
      <Button onClick={onCancel}>Hủy thay đổi</Button>
      <Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={busy}>Lưu thay đổi hồ sơ</Button>
    </div>
  );
}
