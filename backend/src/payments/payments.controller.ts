import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Res,
  Header,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { InstallmentPaymentDto } from './dto/installment-payment.dto';
import { PaymentQueryDto } from './dto/payment-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IUser } from '../auth/interfaces/user.interface';
import type { Request, Response } from 'express';

import { PaymentGovernanceService } from './services/payment-governance.service';
import { InvoiceService } from './services/invoice.service';
import { ReconciliationService } from './services/reconciliation.service';

@Controller('payments')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly governanceService: PaymentGovernanceService,
    private readonly invoiceService: InvoiceService,
    private readonly reconciliationService: ReconciliationService,
  ) {}

  @Get('governance-kpis')
  @Permissions('payment.view')
  getGovernanceKpis() {
    return this.governanceService.getGovernanceKpis();
  }

  @Get('admin-dashboard')
  @Permissions('payment.view')
  getAdminDashboard() {
    return this.governanceService.getAdminDashboardKpis();
  }

  @Get('admin-analytics')
  @Permissions('payment.view')
  getAdminAnalytics(@CurrentUser() user: IUser) {
    return this.paymentsService.getStats(user?.id);
  }

  @Get('requests/admin')
  @Permissions('payment.view')
  getPaymentRequestsAdmin(@Query() query: any) {
    return this.governanceService.getPaymentRequestsAdmin(query);
  }

  @Get('student-context/:studentId')
  @Permissions('payment.view')
  getStudentPaymentContext(@Param('studentId') studentId: string) {
    return this.governanceService.getStudentPaymentContext(studentId);
  }

  @Patch('requests/:id')
  @Permissions('payment.create')
  updatePaymentRequest(
    @CurrentUser() user: IUser,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.governanceService.updatePaymentRequest(id, user.id, dto);
  }

  @Post('requests/batch')
  @Permissions('payment.create')
  batchCreatePaymentRequests(
    @CurrentUser() user: IUser,
    @Body() body: { requests: any[] },
  ) {
    return this.governanceService.batchCreatePaymentRequests(
      user.id,
      body.requests,
    );
  }

  @Get('verification-queue')
  @Permissions('payment.verify')
  getVerificationQueue(@CurrentUser() user: IUser, @Query() query: any) {
    return this.governanceService.getVerificationQueue(
      user.role,
      user.id,
      query,
    );
  }

  @Post('verify-step')
  @Permissions('payment.verify')
  verifyStep(
    @Req() req: Request,
    @CurrentUser() user: IUser,
    @Body() dto: any,
  ) {
    return this.governanceService.verifyPaymentStep(
      user.id,
      user.role,
      dto,
      req.ip,
    );
  }

  @Post('submit-utr')
  submitUtr(@Req() req: Request, @CurrentUser() user: IUser, @Body() dto: any) {
    return this.governanceService.submitRequestedUtr(
      dto.paymentId,
      user.id,
      dto.utrNumber,
      req.ip,
    );
  }

  @Post('terms-accept')
  recordTermsAcceptance(
    @Req() req: Request,
    @CurrentUser() user: IUser,
    @Body() dto: any,
  ) {
    return this.governanceService.recordTermsAcceptance(
      user.id,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('request')
  @Permissions('payment.create')
  createPaymentRequest(@CurrentUser() user: IUser, @Body() dto: any) {
    return this.governanceService.createPaymentRequest(user.id, dto);
  }

  @Post('payment-requests')
  @Permissions('payment.create')
  createPaymentRequestAlias(@CurrentUser() user: IUser, @Body() dto: any) {
    return this.governanceService.createPaymentRequest(user.id, dto);
  }

  @Get('requests/my')
  getMyPaymentRequests(@CurrentUser() user: IUser) {
    return this.governanceService.getStudentPaymentRequests(user.id);
  }

  @Get('college-config/:collegeId')
  getCollegePaymentConfig(@Param('collegeId') collegeId: string) {
    return this.governanceService.getCollegePaymentConfig(collegeId);
  }

  @Patch('college-config/:collegeId')
  @Permissions('payment.create')
  updateCollegePaymentConfig(
    @CurrentUser() user: IUser,
    @Param('collegeId') collegeId: string,
    @Body() dto: any,
  ) {
    return this.governanceService.updateCollegePaymentConfig(
      collegeId,
      user.id,
      dto,
    );
  }

  @Get('timeline/:paymentId')
  getPaymentTimeline(@Param('paymentId') paymentId: string) {
    return this.governanceService.getPaymentTimeline(paymentId);
  }

  @Post('fee-heads')
  @Permissions('payment.create')
  createFeeHead(@CurrentUser() user: IUser, @Body() dto: any) {
    return this.governanceService.createFeeHead(user.id, dto);
  }

  @Get('fee-heads')
  getFeeHeads(@Query() query: any) {
    return this.governanceService.getFeeHeads(query);
  }

  @Patch('fee-heads/:id')
  @Permissions('payment.create')
  updateFeeHead(
    @CurrentUser() user: IUser,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.governanceService.updateFeeHead(id, user.id, dto);
  }

  @Delete('fee-heads/:id')
  @Permissions('payment.create')
  deleteFeeHead(@CurrentUser() user: IUser, @Param('id') id: string) {
    return this.governanceService.deleteFeeHead(id, user.id);
  }

  @Post('assign-verification')
  @Permissions('payment.verify')
  assignVerification(@CurrentUser() user: IUser, @Body() dto: any) {
    return this.governanceService.assignVerificationReviewer(
      dto.paymentId,
      user.id,
      dto,
    );
  }

  @Get('sla-breaches')
  @Permissions('payment.view')
  getSlaBreaches() {
    return this.governanceService.getSlaBreaches();
  }

  @Get('fraud-alerts')
  @Permissions('payment.view')
  getFraudAlerts() {
    return this.governanceService.getFraudAlerts();
  }

  @Get('stats')
  @Permissions('payment.view')
  getStats(@CurrentUser() user: IUser) {
    return this.paymentsService.getStats(user?.id);
  }

  @Get('pending')
  @Permissions('payment.view')
  getPending(@CurrentUser() user: IUser) {
    return this.paymentsService.getPending(user?.id);
  }

  @Get('completed')
  @Permissions('payment.view')
  getCompleted(@CurrentUser() user: IUser) {
    return this.paymentsService.getCompleted(user?.id);
  }

  @Get('failed')
  @Permissions('payment.view')
  getFailed(@CurrentUser() user: IUser) {
    return this.paymentsService.getFailed(user?.id);
  }

  @Get('refunded')
  @Permissions('payment.view')
  getRefunded(@CurrentUser() user: IUser) {
    return this.paymentsService.getRefunded(user?.id);
  }

  @Get('export')
  @Permissions('payment.export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="payments_report.csv"')
  async export(@Query() query: PaymentQueryDto, @CurrentUser() user: IUser) {
    return this.paymentsService.exportPayments(query, user?.id);
  }

  @Get('student/:id')
  @Permissions('payment.view')
  getStudentPayments(
    @CurrentUser() user: IUser,
    @Param('id') studentId: string,
  ) {
    const targetId = user.role === 'STUDENT' ? user.id : studentId;
    return this.paymentsService.getStudentPayments(targetId, user.id);
  }

  @Get('my')
  getMyPayments(@CurrentUser() user: IUser) {
    return this.paymentsService.getStudentPayments(user.id, user.id);
  }

  @Get('me')
  getMePayments(@CurrentUser() user: IUser) {
    return this.paymentsService.getStudentPayments(user.id, user.id);
  }

  @Get('summary')
  getSummary(@CurrentUser() user: IUser) {
    return this.paymentsService.getStudentPaymentSummary(user.id);
  }

  @Get('college-bank/:collegeId')
  getCollegeBankAccounts(@Param('collegeId') collegeId: string) {
    return this.paymentsService.getCollegeBankAccounts(collegeId);
  }

  @Post('create-order')
  createOrder(@CurrentUser() user: IUser, @Body() dto: any) {
    return this.paymentsService.createPaymentOrder(user.id, dto);
  }

  @Post('upload-proof')
  uploadProof(@CurrentUser() user: IUser, @Body() dto: any) {
    return this.paymentsService.uploadPaymentProof(user.id, dto.paymentId, dto);
  }

  @Post('verify-proof')
  @Permissions('payment.verify')
  verifyProof(@CurrentUser() user: IUser, @Body() dto: any) {
    return this.paymentsService.verifyDirectPaymentProof(
      user.id,
      dto.paymentId,
      dto.action,
      dto.remarks,
    );
  }

  @Post('configure-bank')
  @Permissions('payment.create')
  configureBank(@CurrentUser() user: IUser, @Body() dto: any) {
    return this.paymentsService.configureCollegeBankAccount(
      user.id,
      dto.collegeId,
      dto,
    );
  }

  @Get('application/:id')
  getApplicationPayments(@Param('id') applicationId: string) {
    return this.paymentsService.getApplicationPayments(applicationId);
  }

  @Get('counselor/:id')
  @Permissions('payment.view')
  getCounselorPayments(
    @CurrentUser() user: IUser,
    @Param('id') counselorId: string,
  ) {
    const targetId = user.role === 'COUNSELOR' ? user.id : counselorId;
    return this.paymentsService.getCounselorPayments(targetId, user.id);
  }

  @Get()
  @Permissions('payment.view')
  findAll(@Query() query: PaymentQueryDto, @CurrentUser() user: IUser) {
    return this.paymentsService.findAll(query, user?.id);
  }

  @Get(':id')
  @Permissions('payment.view')
  findOne(@Param('id') id: string, @CurrentUser() user: IUser) {
    return this.paymentsService.findOne(id, user?.id);
  }

  @Get(':id/invoice')
  async renderInvoice(
    @Param('id') id: string,
    @Res() res: Response,
    @CurrentUser() user: IUser,
  ) {
    const invoice = await this.paymentsService.generateInvoice(id, user?.id);
    res.setHeader('Content-Type', 'text/html');
    return res.send(invoice.html);
  }

  @Get(':id/receipt')
  async renderReceipt(
    @Param('id') id: string,
    @Res() res: Response,
    @CurrentUser() user: IUser,
  ) {
    const receipt = await this.paymentsService.generateReceipt(id, user?.id);
    res.setHeader('Content-Type', 'text/html');
    return res.send(receipt.html);
  }

  @Post()
  create(
    @Req() req: Request,
    @CurrentUser() user: IUser,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(
      user.id,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('verify')
  @Permissions('payment.verify')
  verify(
    @Req() req: Request,
    @CurrentUser() user: IUser,
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.paymentsService.verifyPayment(
      dto,
      user.id,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('refund')
  @Permissions('payment.refund')
  refund(
    @Req() req: Request,
    @CurrentUser() user: IUser,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.paymentsService.refundPayment(
      dto,
      user.id,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('installment')
  installment(
    @Req() req: Request,
    @CurrentUser() user: IUser,
    @Body() dto: InstallmentPaymentDto,
  ) {
    return this.paymentsService.installmentPayment(
      dto,
      user.id,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('generate-invoice')
  generateInvoice(
    @Body('paymentId') paymentId: string,
    @CurrentUser() user: IUser,
  ) {
    return this.paymentsService.generateInvoice(paymentId, user?.id);
  }

  @Post('generate-receipt')
  generateReceipt(
    @Body('paymentId') paymentId: string,
    @CurrentUser() user: IUser,
  ) {
    return this.paymentsService.generateReceipt(paymentId, user?.id);
  }

  @Patch(':id')
  @Permissions('payment.create')
  update(
    @Req() req: Request,
    @CurrentUser() user: IUser,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentStatusDto,
  ) {
    return this.paymentsService.updatePaymentStatus(
      id,
      dto,
      user.id,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete(':id')
  @Permissions('payment.create')
  remove(
    @Req() req: Request,
    @CurrentUser() user: IUser,
    @Param('id') id: string,
  ) {
    return this.paymentsService.softDelete(
      id,
      user.id,
      req.ip,
      req.headers['user-agent'],
    );
  }

  // ==========================================
  // ENTERPRISE PAYMENT & FINANCE WORKFLOW ROUTES
  // ==========================================

  @Post('counselor/request')
  @Permissions('payment.create')
  counselorCreateRequest(
    @CurrentUser() user: IUser,
    @Body() dto: any,
  ) {
    return this.governanceService.counselorCreateRequest(user, dto);
  }

  @Get('finance/queue')
  @Permissions('payment.view')
  getFinanceQueue(
    @CurrentUser() user: IUser,
    @Query() query: any,
  ) {
    return this.governanceService.getFinanceQueue(user, query);
  }

  @Post('requests/:id/finance-approve')
  @Permissions('payment.verify')
  financeApproveRequest(
    @CurrentUser() user: IUser,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.governanceService.financeApproveRequest(user, id, dto);
  }

  @Post('requests/:id/finance-reject')
  @Permissions('payment.verify')
  financeRejectRequest(
    @CurrentUser() user: IUser,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.governanceService.financeRejectRequest(user, id, dto);
  }

  @Post('student/submit-proof')
  studentSubmitProof(
    @CurrentUser() user: IUser,
    @Body() dto: any,
  ) {
    return this.governanceService.studentSubmitManualProof(user, dto);
  }

  @Post('requests/:id/college-confirm')
  @Permissions('payment.verify')
  seniorCounselorCollegeConfirm(
    @CurrentUser() user: IUser,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.governanceService.seniorCounselorCollegeConfirm(user, {
      ...dto,
      paymentRequestId: id,
    });
  }

  @Post('requests/:id/verify-final')
  @Permissions('payment.verify')
  financeVerifyPaymentFinal(
    @CurrentUser() user: IUser,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.governanceService.financeVerifyPaymentFinal(user, id, dto);
  }

  @Post('applications/:id/confirm-admission')
  @Permissions('application.edit')
  confirmAdmissionFinal(
    @CurrentUser() user: IUser,
    @Param('id') id: string,
  ) {
    return this.governanceService.confirmAdmissionFinal(user, id);
  }

  // ==========================================
  // AUTHORITATIVE INVOICE ROUTES
  // ==========================================

  @Post('invoices/generate')
  @Permissions('payment.create')
  createAuthoritativeInvoice(
    @CurrentUser() user: IUser,
    @Body() dto: any,
  ) {
    return this.invoiceService.generateInvoice(dto, user.id);
  }

  @Get('invoices')
  @Permissions('payment.view')
  findAllInvoices(
    @CurrentUser() user: IUser,
    @Query() query: any,
  ) {
    return this.invoiceService.findAll(query, user.id);
  }

  @Get('invoices/:id')
  @Permissions('payment.view')
  findInvoiceById(
    @CurrentUser() user: IUser,
    @Param('id') id: string,
  ) {
    return this.invoiceService.findOne(id, user.id);
  }

  @Post('invoices/:id/cancel')
  @Permissions('payment.create')
  cancelInvoice(
    @CurrentUser() user: IUser,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.invoiceService.cancelInvoice(id, user.id, reason || 'Cancelled by admin');
  }

  // ==========================================
  // FINANCIAL RECONCILIATION ROUTES
  // ==========================================

  @Post('reconciliation/batch')
  @Permissions('payment.verify')
  processSettlementBatch(
    @CurrentUser() user: IUser,
    @Body('records') records: any[],
  ) {
    return this.reconciliationService.processSettlementBatch(records || [], user.id);
  }

  @Get('reconciliation/queue')
  @Permissions('payment.view')
  getReconciliationQueue(
    @CurrentUser() user: IUser,
    @Query() query: any,
  ) {
    return this.reconciliationService.getQueue(query, user.id);
  }

  @Post('reconciliation/:id/resolve')
  @Permissions('payment.verify')
  resolveReconciliationDiscrepancy(
    @CurrentUser() user: IUser,
    @Param('id') id: string,
    @Body() dto: { remarks: string; action: 'RESOLVE_MATCH' | 'FORCE_RECONCILE' | 'FLAG_FRAUD' },
  ) {
    return this.reconciliationService.resolveDiscrepancy(id, dto.remarks, dto.action, user.id);
  }
}
