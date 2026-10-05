import { render, screen, within } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import TransactionNoteDialog from '../components/TransactionNoteDialog.vue';
import { transactionFixture } from '../test/setup';
import type { TransactionNoteResult } from '../types';

const propsFor = () => ({
  transaction: transactionFixture({ note: '错字', user_note: '错字', note_revision: 0 }),
  formatSignedAmount: () => '+1.00 CNY',
  getTransactionContext: () => '小乐 · 零花钱 · CNY',
  formatTimestamp: (value: string) => value,
  onUpdateNote: vi.fn(async (): Promise<TransactionNoteResult> => ({ ok: true, transactions: [] })),
  onLoadNoteHistory: vi.fn(async () => ({ ok: true as const, edits: [] })),
  onClose: vi.fn(),
});

describe('TransactionNoteDialog', () => {
  it('focuses the note, preserves transaction context, and disables unchanged saves', async () => {
    const user = userEvent.setup();
    const props = propsFor();
    render(TransactionNoteDialog, { props });
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription(/小乐.*1.00 CNY/);
    await nextTick();
    expect(screen.getByRole('textbox', { name: '备注' })).toHaveFocus();
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), '正确备注');
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(props.onUpdateNote).toHaveBeenCalledWith({ transactionId: 'txn-1', note: '正确备注', expectedRevision: 0 });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('allows clearing a note and blocks duplicate submissions and dismissal while saving', async () => {
    const user = userEvent.setup();
    const props = propsFor();
    let finish!: (result: TransactionNoteResult) => void;
    props.onUpdateNote.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(TransactionNoteDialog, { props });
    await user.clear(screen.getByRole('textbox'));
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(screen.getByRole('button', { name: '保存中…' })).toBeDisabled();
    expect(screen.getByRole('textbox')).toBeDisabled();
    await user.keyboard('{Escape}{Tab}{Enter}');
    expect(props.onUpdateNote).toHaveBeenCalledTimes(1);
    expect(props.onUpdateNote).toHaveBeenCalledWith({ transactionId: 'txn-1', note: '', expectedRevision: 0 });
    expect(props.onClose).not.toHaveBeenCalled();
    finish({ ok: false, message: '网络暂不可用' });
    await nextTick(); await nextTick();
    expect(await screen.findByRole('alert')).toHaveTextContent('网络暂不可用');
    expect(screen.getByRole('textbox')).toHaveValue('');
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(props.onUpdateNote).toHaveBeenCalledTimes(2);
    finish({ ok: true, transactions: [] });
  });

  it('retains a conflicting draft, shows the latest note and uses its revision on a reviewed retry', async () => {
    const user = userEvent.setup();
    const props = propsFor();
    props.onUpdateNote.mockResolvedValueOnce({ ok: false, message: '备注已被修改，请核对最新内容后再保存。',
      latest: transactionFixture({ note: '另一位家长的修改', user_note: '另一位家长的修改', note_revision: 2 }) });
    render(TransactionNoteDialog, { props });
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), '我的修改');
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(screen.getByRole('textbox')).toHaveValue('我的修改');
    expect(screen.getByText('最新备注：另一位家长的修改')).toBeInTheDocument();
    expect(props.onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '核对后保存' }));
    expect(props.onUpdateNote).toHaveBeenLastCalledWith({ transactionId: 'txn-1', note: '我的修改', expectedRevision: 2 });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('lets an editor adopt the latest note without writing it again', async () => {
    const user = userEvent.setup();
    const props = propsFor();
    props.onUpdateNote.mockResolvedValue({ ok: false, message: '有更新', latest: transactionFixture({ note: '最新', user_note: '最新', note_revision: 1 }) });
    render(TransactionNoteDialog, { props });
    await user.type(screen.getByRole('textbox'), '改');
    await user.click(screen.getByRole('button', { name: '保存' }));
    await user.click(screen.getByRole('button', { name: '使用最新备注' }));
    expect(screen.getByRole('textbox')).toHaveValue('最新');
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
  });

  it('edits only the separated transfer text, even when account names contain delimiters', async () => {
    const props = propsFor();
    props.transaction = transactionFixture({ type: 'transfer_in', note: '来自 小乐 - 甲 储蓄 - 旧备注 - 尾部',
      user_note: '旧备注 - 尾部', note_prefix: '来自 小乐 - 甲 储蓄', related_account_id: 'source' });
    render(TransactionNoteDialog, { props });
    expect(screen.getByRole('textbox')).toHaveValue('旧备注 - 尾部');
    expect(screen.getByText('来自 小乐 - 甲 储蓄')).toBeInTheDocument();
    expect(screen.getByText('转入和转出记录的备注会同步修改。')).toBeInTheDocument();
  });

  it('shows read-only audit history with retry, editor, time, and before/after text', async () => {
    const user = userEvent.setup();
    const props = propsFor();
    const onLoadNoteHistory = vi.fn().mockResolvedValueOnce({ ok: false, message: '修改记录加载失败，请重试。' })
      .mockResolvedValue({ ok: true, edits: [{ id: 'edit', updated_by_name: '妈妈', updated_at: '2026-10-05 12:00', old_note: '错字', new_note: null }] });
    render(TransactionNoteDialog, { props: { ...props, readOnly: true, onLoadNoteHistory } });
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: '保存' })).toBeNull();
    expect(await screen.findByRole('alert')).toHaveTextContent('修改记录加载失败');
    await user.click(screen.getByRole('button', { name: '重试加载' }));
    const dialog = within(screen.getByRole('dialog'));
    expect(await dialog.findByText('妈妈 · 2026-10-05 12:00')).toBeInTheDocument();
    expect(dialog.getByText('错字')).toBeInTheDocument();
    expect(dialog.getByText('（无备注）')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '关闭' }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onUpdateNote).not.toHaveBeenCalled();
  });
});
