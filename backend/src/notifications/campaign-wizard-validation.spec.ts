import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateCampaignDto, UpdateCampaignDto } from './communication-campaign.service';
import { SaveAudienceDto, PreviewAudienceDto } from './audience-builder.service';
import { CreateTemplateDto, PreviewTemplateDto } from './template-engine.service';
import { ValidationPipe } from '@nestjs/common';

describe('Campaign Wizard Validation and Canonical Data Contract Tests', () => {
  const validationPipe = new ValidationPipe({
    whitelist: true,
    transform: true,
  });

  it('Requirement 61: Given campaignName = "ergterhgrthrt", class-validator must NOT strip campaignName or message fields', async () => {
    const rawPayload = {
      campaignName: 'ergterhgrthrt',
      name: 'ergterhgrthrt',
      type: 'PROMOTIONAL',
      channels: ['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP'],
      targetEntity: 'STUDENT',
      messageTitle: 'TITLE_A',
      emailSubject: 'SUBJECT_B',
      messageBody: 'BODY_C',
      smsBody: 'SMS_D',
      whatsAppBody: 'WHATSAPP_E',
      audienceFilter: {
        targetEntity: 'STUDENT',
        conditions: [],
        exclusions: [],
        collegeRelationship: 'ANY',
      },
    };

    // Transform through NestJS ValidationPipe
    const transformed = await validationPipe.transform(rawPayload, {
      type: 'body',
      metatype: CreateCampaignDto,
    });

    expect(transformed).toBeDefined();
    expect(transformed.campaignName).toBe('ergterhgrthrt');
    expect(transformed.name).toBe('ergterhgrthrt');
    expect(transformed.messageTitle).toBe('TITLE_A');
    expect(transformed.emailSubject).toBe('SUBJECT_B');
    expect(transformed.messageBody).toBe('BODY_C');
    expect(transformed.smsBody).toBe('SMS_D');
    expect(transformed.whatsAppBody).toBe('WHATSAPP_E');
    expect(transformed.channels).toEqual(['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP']);
    expect(transformed.audienceFilter).toBeDefined();
  });

  it('Sentinel values must not cross-contaminate or swap', async () => {
    const sentinelPayload = {
      campaignName: 'AAA_CAMPAIGN',
      name: 'AAA_CAMPAIGN',
      type: 'PROMOTIONAL',
      channels: ['IN_APP', 'EMAIL'],
      messageTitle: 'BBB_TITLE',
      emailSubject: 'CCC_SUBJECT',
      messageBody: 'DDD_BODY',
      smsBody: 'EEE_SMS',
      whatsAppBody: 'FFF_WHATSAPP',
    };

    const instance = plainToInstance(CreateCampaignDto, sentinelPayload);
    const errors = await validate(instance);
    expect(errors.length).toBe(0);

    expect(instance.campaignName).toBe('AAA_CAMPAIGN');
    expect(instance.messageTitle).toBe('BBB_TITLE');
    expect(instance.emailSubject).toBe('CCC_SUBJECT');
    expect(instance.messageBody).toBe('DDD_BODY');
    expect(instance.smsBody).toBe('EEE_SMS');
    expect(instance.whatsAppBody).toBe('FFF_WHATSAPP');

    // Verify none are swapped
    expect(instance.campaignName).not.toBe(instance.messageTitle);
    expect(instance.messageTitle).not.toBe(instance.emailSubject);
    expect(instance.emailSubject).not.toBe(instance.messageBody);
    expect(instance.messageBody).not.toBe(instance.smsBody);
  });

  it('Audience DTOs and Preview DTOs must pass ValidationPipe without property stripping', async () => {
    const previewPayload = {
      filter: {
        targetEntity: 'STUDENT',
        conditions: [{ field: 'state', operator: 'EQ', value: 'Bihar' }],
      },
      channels: ['IN_APP', 'EMAIL', 'SMS'],
    };

    const transformedPreview = await validationPipe.transform(previewPayload, {
      type: 'body',
      metatype: PreviewAudienceDto,
    });

    expect(transformedPreview.filter).toBeDefined();
    expect(transformedPreview.filter.targetEntity).toBe('STUDENT');
    expect(transformedPreview.channels).toEqual(['IN_APP', 'EMAIL', 'SMS']);
  });

  it('Template DTOs must pass ValidationPipe without property stripping', async () => {
    const templatePayload = {
      code: 'TEST_TPL_001',
      name: 'Test Template',
      category: 'TRANSACTIONAL',
      channels: ['IN_APP', 'EMAIL'],
      subject: 'Test Subject',
      inAppTitle: 'Test Title',
      inAppMessage: 'Test Message',
    };

    const transformedTemplate = await validationPipe.transform(templatePayload, {
      type: 'body',
      metatype: CreateTemplateDto,
    });

    expect(transformedTemplate.code).toBe('TEST_TPL_001');
    expect(transformedTemplate.name).toBe('Test Template');
    expect(transformedTemplate.inAppTitle).toBe('Test Title');
    expect(transformedTemplate.inAppMessage).toBe('Test Message');
  });
});
