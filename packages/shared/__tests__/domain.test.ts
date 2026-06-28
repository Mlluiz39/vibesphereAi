import {
  ConversationState,
  MessageDirection,
  DocumentStatus,
  WhatsAppProviderKind,
  LLMProviderKind,
  QUEUE,
} from '../src/domain';

describe('ConversationState', () => {
  it('should have correct values', () => {
    expect(ConversationState.AI).toBe('ai');
    expect(ConversationState.HUMAN).toBe('human');
    expect(ConversationState.WAITING).toBe('waiting');
    expect(ConversationState.CLOSED).toBe('closed');
  });
});

describe('MessageDirection', () => {
  it('should have correct values', () => {
    expect(MessageDirection.INBOUND).toBe('inbound');
    expect(MessageDirection.OUTBOUND).toBe('outbound');
  });
});

describe('DocumentStatus', () => {
  it('should have correct values', () => {
    expect(DocumentStatus.PENDING).toBe('pending');
    expect(DocumentStatus.PROCESSING).toBe('processing');
    expect(DocumentStatus.DONE).toBe('done');
    expect(DocumentStatus.ERROR).toBe('error');
  });
});

describe('WhatsAppProviderKind', () => {
  it('should have correct values', () => {
    expect(WhatsAppProviderKind.META_CLOUD).toBe('meta_cloud');
    expect(WhatsAppProviderKind.EVOLUTION).toBe('evolution');
    expect(WhatsAppProviderKind.BAILEYS).toBe('baileys');
  });
});

describe('LLMProviderKind', () => {
  it('should have correct values', () => {
    expect(LLMProviderKind.OPENAI).toBe('openai');
    expect(LLMProviderKind.CLAUDE).toBe('claude');
    expect(LLMProviderKind.GEMINI).toBe('gemini');
    expect(LLMProviderKind.DEEPSEEK).toBe('deepseek');
    expect(LLMProviderKind.OPENROUTER).toBe('openrouter');
  });
});

describe('QUEUE', () => {
  it('should have correct queue names', () => {
    expect(QUEUE.INBOUND_MESSAGES).toBe('inbound-messages');
    expect(QUEUE.DOCUMENT_INGESTION).toBe('document-ingestion');
    expect(QUEUE.FLOW_RUNS).toBe('flow-runs');
  });
});
