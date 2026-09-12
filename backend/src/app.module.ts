import { ConfigModule } from '@nestjs/config';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { StudentsModule } from './students/students.module';
import { CounselorsModule } from './counselors/counselors.module';
import { DashboardsModule } from './dashboards/dashboards.module';
import { RolesModule } from './roles/roles.module';
import { PrismaModule } from './prisma/prisma.module';
import { CollegesModule } from './colleges/colleges.module';
import { CoursesModule } from './courses/courses.module';
import { AuditModule } from './audit/audit.module';
import { ApplicationModule } from './application/application.module';
import { LeadModule } from './lead/lead.module';
import { DocumentsModule } from './documents/documents.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AiCounselorModule } from './ai-counselor/ai-counselor.module';
import { OrganizationModule } from './organization/organization.module';
import { HealthModule } from './health/health.module';
import { PositionsModule } from './positions/positions.module';
import { StaffOnboardingModule } from './staff-onboarding/staff-onboarding.module';
import { CollegeCounselingModule } from './college-counseling/college-counseling.module';
import { PaymentsModule } from './payments/payments.module';
import { JourneyModule } from './journey/journey.module';
import { ReportingEnrollmentModule } from './reporting-enrollment/reporting-enrollment.module';
import { ReviewsRankingModule } from './reviews-ranking/reviews-ranking.module';
import { TasksModule } from './tasks/tasks.module';
import { CrmActivityModule } from './crm-activity/crm-activity.module';
import { SettingsModule } from './settings/settings.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SupportModule } from './support/support.module';
import { ReferralModule } from './referrals/referral.module';
import { CouponModule } from './coupons/coupon.module';
import { FeesModule } from './fees/fees.module';
import { LiveSyncModule } from './events/live-sync.module';
import { BlogModule } from './blog/blog.module';
import { FaqModule } from './faq/faq.module';
import { ExamsModule } from './exams/exams.module';
import { ScholarshipsModule } from './scholarships/scholarships.module';
import { StudyMaterialsModule } from './study-materials/study-materials.module';
import { SearchModule } from './search/search.module';
import { CommonController } from './common/common.controller';
import { EducationFinanceModule } from './education-finance/education-finance.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    UsersModule,
    StudentsModule,
    CounselorsModule,
    DashboardsModule,
    RolesModule,
    PrismaModule,
    LiveSyncModule,
    AuditModule,
    CollegesModule,
    CoursesModule,
    ApplicationModule,
    LeadModule,
    DocumentsModule,
    NotificationsModule,
    AiCounselorModule,
    OrganizationModule,
    HealthModule,
    PositionsModule,
    StaffOnboardingModule,
    CollegeCounselingModule,
    PaymentsModule,
    JourneyModule,
    ReportingEnrollmentModule,
    ReviewsRankingModule,
    TasksModule,
    CrmActivityModule,
    SettingsModule,
    AnalyticsModule,
    SupportModule,
    ReferralModule,
    CouponModule,
    FeesModule,
    BlogModule,
    FaqModule,
    ExamsModule,
    ScholarshipsModule,
    StudyMaterialsModule,
    SearchModule,
    EducationFinanceModule,
  ],
  controllers: [AppController, CommonController],
  providers: [AppService],
})
export class AppModule {}
