import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from './auth.service';

import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import {
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  SendMobileOtpDto,
  VerifyMobileOtpDto,
  GoogleAuthDto,
  SendEmailVerificationDto,
  VerifyEmailDto,
  ForgotPasswordSendOtpDto,
  ForgotPasswordVerifyOtpDto,
  ResetPasswordWithTokenDto,
  SendRegistrationMobileOtpDto,
  VerifyRegistrationMobileOtpDto,
  SendRegistrationEmailOtpDto,
  VerifyRegistrationEmailOtpDto,
  SendMobileVerificationDto,
  VerifyUserMobileDto,
  FirstLoginSendOtpDto,
  FirstLoginChangePasswordDto,
  ActivateAccountDto,
} from './dto/auth-extra.dto';

import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register/send-mobile-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP for student registration' })
  @ApiBody({ type: SendRegistrationMobileOtpDto })
  @ApiResponse({ status: 200, description: 'Registration OTP sent successfully' })
  sendRegistrationMobileOtp(@Body() dto: SendRegistrationMobileOtpDto, @Req() req: any) {
    return this.authService.sendRegistrationMobileOtp(dto, req.ip);
  }

  @Post('register/verify-mobile-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify registration OTP and receive single-use signup token' })
  @ApiBody({ type: VerifyRegistrationMobileOtpDto })
  @ApiResponse({ status: 200, description: 'Registration mobile verified successfully' })
  verifyRegistrationMobileOtp(@Body() dto: VerifyRegistrationMobileOtpDto, @Req() req: any) {
    return this.authService.verifyRegistrationMobileOtp(dto, req.ip);
  }

  @Post('register/send-email-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send Email OTP for student registration' })
  @ApiBody({ type: SendRegistrationEmailOtpDto })
  @ApiResponse({ status: 200, description: 'Registration Email OTP sent successfully' })
  sendRegistrationEmailOtp(@Body() dto: SendRegistrationEmailOtpDto, @Req() req: any) {
    return this.authService.sendRegistrationEmailOtp(dto, req.ip);
  }

  @Post('register/verify-email-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify registration email OTP and receive single-use signup token' })
  @ApiBody({ type: VerifyRegistrationEmailOtpDto })
  @ApiResponse({ status: 200, description: 'Registration email verified successfully' })
  verifyRegistrationEmailOtp(@Body() dto: VerifyRegistrationEmailOtpDto, @Req() req: any) {
    return this.authService.verifyRegistrationEmailOtp(dto, req.ip);
  }

  @Post('mobile/send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send 6-digit OTP to mobile number' })
  @ApiBody({ type: SendMobileOtpDto })
  @ApiResponse({ status: 200, description: 'OTP sent successfully' })
  sendMobileOtp(@Body() dto: SendMobileOtpDto, @Req() req: any) {
    return this.authService.sendMobileOtp(dto, req.ip);
  }

  @Post('mobile/verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and login or register student' })
  @ApiBody({ type: VerifyMobileOtpDto })
  @ApiResponse({ status: 200, description: 'Student authenticated successfully' })
  verifyMobileOtp(@Body() dto: VerifyMobileOtpDto, @Req() req: any) {
    return this.authService.verifyMobileOtp(dto, req.ip);
  }

  @Post('signup')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: SignupDto })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  signup(@Body() dto: SignupDto, @Req() req: any) {
    return this.authService.signup(dto, req.ip);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login a user' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in, returns JWT',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  login(@Body() dto: LoginDto, @Req() req: any) {
    return this.authService.login(dto, req.ip);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Google authentication' })
  @ApiBody({ type: GoogleAuthDto })
  @ApiResponse({ status: 200, description: 'Google authentication successful' })
  googleAuth(@Body() dto: GoogleAuthDto, @Req() req: any) {
    return this.authService.googleAuth(dto, req.ip);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('mobile/send-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send mobile verification code for student' })
  @ApiBody({ type: SendMobileVerificationDto })
  @ApiResponse({ status: 200, description: 'Verification OTP sent' })
  sendMobileVerification(
    @Body() dto: SendMobileVerificationDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.authService.sendUserMobileVerification(userId, dto?.mobile, req.ip);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('mobile/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify user mobile with OTP' })
  @ApiBody({ type: VerifyUserMobileDto })
  @ApiResponse({ status: 200, description: 'Mobile verified successfully' })
  verifyMobile(@Body() dto: VerifyUserMobileDto, @Req() req: any) {
    const userId = req.user?.id;
    return this.authService.verifyUserMobile(userId, dto.mobile, dto.otp, req.ip);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('email/send-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send mailbox verification code' })
  @ApiBody({ type: SendEmailVerificationDto })
  @ApiResponse({ status: 200, description: 'Verification code sent' })
  sendEmailVerification(
    @Body() dto: SendEmailVerificationDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id;
    return this.authService.sendEmailVerification(userId, dto?.email, req.ip);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email verification code' })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  verifyEmail(@Body() dto: VerifyEmailDto, @Req() req: any) {
    const userId = req.user?.id;
    return this.authService.verifyEmail(userId, dto.email, dto.code, req.ip);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, description: 'New tokens returned' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  refresh(@Body() dto: RefreshTokenDto) {
    const token = dto.refreshToken || dto.refresh_token;
    if (!token) {
      throw new BadRequestException('Refresh token is required');
    }
    return this.authService.refresh(token);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  logout(@Body() body: { refreshToken?: string; refresh_token?: string }, @Req() req: any) {
    const token = body?.refreshToken || body?.refresh_token;
    return this.authService.logout(req.user?.id, token);
  }

  @Post('forgot-password/send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send password reset OTP via Mobile or Email' })
  @ApiBody({ type: ForgotPasswordSendOtpDto })
  @ApiResponse({ status: 200, description: 'OTP sent if user exists' })
  forgotPasswordSendOtp(@Body() dto: ForgotPasswordSendOtpDto, @Req() req: any) {
    return this.authService.forgotPasswordSendOtp(dto, req.ip);
  }

  @Post('forgot-password/verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify password reset OTP and receive reset token' })
  @ApiBody({ type: ForgotPasswordVerifyOtpDto })
  @ApiResponse({ status: 200, description: 'OTP verified, reset token issued' })
  forgotPasswordVerifyOtp(@Body() dto: ForgotPasswordVerifyOtpDto, @Req() req: any) {
    return this.authService.forgotPasswordVerifyOtp(dto, req.ip);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset via email link' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: 'Reset email sent if user exists' })
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: any) {
    return this.authService.forgotPassword(dto.email, req.ip);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  resetPassword(@Body() body: any, @Req() req: any) {
    if (body.confirmPassword || body.resetToken) {
      return this.authService.resetPasswordWithToken(
        {
          resetToken: body.resetToken || body.token,
          newPassword: body.newPassword,
          confirmPassword: body.confirmPassword || body.newPassword,
        },
        req.ip,
      );
    }
    return this.authService.resetPassword(body.token, body.newPassword, req.ip);
  }

  @Get('reset-password/verify')
  @ApiOperation({ summary: 'Verify password reset token' })
  @ApiResponse({ status: 200, description: 'Reset token verification result' })
  verifyResetToken(@Query('token') token: string) {
    return this.authService.verifyResetToken(token);
  }

  @Post('first-login/send-otp')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Send OTP to official email for first-login mandatory password change' })
  @ApiBody({ type: FirstLoginSendOtpDto })
  @ApiResponse({ status: 200, description: 'OTP sent to registered official email' })
  firstLoginSendOtp(@Body() dto: FirstLoginSendOtpDto, @Req() req: any) {
    return this.authService.sendFirstLoginOtp(dto, req.ip, req.user);
  }

  @Post('first-login/change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Verify OTP and set permanent password on first login' })
  @ApiBody({ type: FirstLoginChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Permanent password set and fresh credentials issued' })
  firstLoginChangePassword(@Body() dto: FirstLoginChangePasswordDto, @Req() req: any) {
    return this.authService.completeFirstLoginPasswordChange(dto, req.ip, req.user);
  }

  @Get('activate-account/verify')
  @ApiOperation({ summary: 'Verify employee activation token' })
  @ApiResponse({ status: 200, description: 'Activation token verification result' })
  verifyActivationToken(@Query('token') token: string) {
    return this.authService.verifyActivationToken(token);
  }

  @Post('activate-account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate employee account and set permanent password' })
  @ApiBody({ type: ActivateAccountDto })
  @ApiResponse({ status: 200, description: 'Account activated successfully' })
  activateAccount(@Body() dto: ActivateAccountDto, @Req() req: any) {
    return this.authService.activateAccount(dto, req.ip);
  }
}

