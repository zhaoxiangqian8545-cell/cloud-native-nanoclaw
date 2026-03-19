import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSend = vi.fn();

vi.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: vi.fn().mockImplementation(() => ({ send: mockSend })),
  GetSecretValueCommand: vi.fn().mockImplementation((input: unknown) => input),
  PutSecretValueCommand: vi.fn().mockImplementation((input: unknown) => input),
  CreateSecretCommand: vi.fn().mockImplementation((input: unknown) => input),
  DeleteSecretCommand: vi.fn().mockImplementation((input: unknown) => input),
}));

vi.mock('../config.js', () => ({
  config: { stage: 'dev', region: 'us-east-1' },
}));

describe('secrets service', () => {
  let getAnthropicApiKey: (userId: string) => Promise<string | null>;
  let putAnthropicApiKey: (userId: string, apiKey: string) => Promise<void>;
  let deleteAnthropicApiKey: (userId: string) => Promise<void>;

  beforeEach(async () => {
    vi.resetModules();
    mockSend.mockReset();

    vi.doMock('@aws-sdk/client-secrets-manager', () => ({
      SecretsManagerClient: vi.fn().mockImplementation(() => ({ send: mockSend })),
      GetSecretValueCommand: vi.fn().mockImplementation((input: unknown) => input),
      PutSecretValueCommand: vi.fn().mockImplementation((input: unknown) => input),
      CreateSecretCommand: vi.fn().mockImplementation((input: unknown) => input),
      DeleteSecretCommand: vi.fn().mockImplementation((input: unknown) => input),
    }));

    vi.doMock('../config.js', () => ({
      config: { stage: 'dev', region: 'us-east-1' },
    }));

    const mod = await import('../services/secrets.js');
    getAnthropicApiKey = mod.getAnthropicApiKey;
    putAnthropicApiKey = mod.putAnthropicApiKey;
    deleteAnthropicApiKey = mod.deleteAnthropicApiKey;
  });

  it('getAnthropicApiKey returns key when secret exists', async () => {
    mockSend.mockResolvedValue({ SecretString: 'sk-ant-test-key' });
    const key = await getAnthropicApiKey('user-1');
    expect(key).toBe('sk-ant-test-key');
  });

  it('getAnthropicApiKey returns null when secret not found', async () => {
    mockSend.mockRejectedValue(
      Object.assign(new Error('not found'), { name: 'ResourceNotFoundException' }),
    );
    const key = await getAnthropicApiKey('user-1');
    expect(key).toBeNull();
  });

  it('putAnthropicApiKey updates existing secret', async () => {
    mockSend.mockResolvedValue({});
    await putAnthropicApiKey('user-1', 'sk-ant-new-key');
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('putAnthropicApiKey creates secret when not found', async () => {
    mockSend
      .mockRejectedValueOnce(
        Object.assign(new Error('not found'), { name: 'ResourceNotFoundException' }),
      )
      .mockResolvedValueOnce({});
    await putAnthropicApiKey('user-1', 'sk-ant-new-key');
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('deleteAnthropicApiKey succeeds even if not found', async () => {
    mockSend.mockRejectedValue(
      Object.assign(new Error('not found'), { name: 'ResourceNotFoundException' }),
    );
    await expect(deleteAnthropicApiKey('user-1')).resolves.toBeUndefined();
  });
});
