import { fireEvent, render, screen, within } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

import type { Transaction } from "../types";
import TransactionsList from "../components/TransactionsList.vue";

const baseTransaction = {
  id: "t-1",
  account_id: "acc-1",
  type: "deposit" as const,
  amount: 10,
  currency: "CNY",
  note: "测试",
  related_account_id: null,
  created_by: "parent",
  created_at: new Date().toISOString(),
  is_void: false,
};

describe("TransactionsList", () => {
  it("triggers void action on long press when confirmed", async () => {
    vi.useFakeTimers();
    const onVoidTransaction = vi.fn();

    render(TransactionsList, {
      props: {
        transactions: [baseTransaction],
        hasMore: false,
        loading: false,
        canVoid: true,
        transactionLabels: {
          deposit: "存入",
          withdrawal: "取出",
          transfer_in: "转入",
          transfer_out: "转出",
          interest: "利息",
        },
        formatSignedAmount: () => "+10.00 CNY",
        transactionTone: () => "text-emerald-600",
        getTransactionNote: () => "测试",
        formatTimestamp: () => "now",
        onLoadMore: vi.fn(),
        onVoidTransaction,
      },
    });

    const row = screen.getByText("测试").closest("li");
    expect(row).toBeTruthy();

    await fireEvent.pointerDown(row as Element, { clientX: 10, clientY: 10 });
    vi.advanceTimersByTime(600);
    await nextTick();

    expect(screen.queryByRole("heading", { name: "撤销这笔交易？" })).toBeNull();
    await fireEvent.click(screen.getByRole("button", { name: "撤销交易" }));
    expect(screen.getByRole("heading", { name: "撤销这笔交易？" })).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "确认撤销" }));
    expect(onVoidTransaction).toHaveBeenCalledWith(baseTransaction);

    vi.useRealTimers();
  });

  it("filters loaded transactions and groups them by month", async () => {
    const user = userEvent.setup();
    render(TransactionsList, {
      props: {
        transactions: [
          { ...baseTransaction, id: "jan", note: "零花钱", created_at: "2026-01-15T00:00:00Z" },
          {
            ...baseTransaction,
            id: "dec",
            type: "withdrawal",
            note: "购买文具",
            created_at: "2025-12-20T00:00:00Z",
          },
        ],
        hasMore: false,
        loading: false,
        transactionLabels: {
          deposit: "存入",
          withdrawal: "取出",
          transfer_in: "转入",
          transfer_out: "转出",
          interest: "利息",
        },
        formatSignedAmount: (transaction) => `${transaction.amount.toFixed(2)} CNY`,
        transactionTone: () => "text-slate-600",
        getTransactionNote: (transaction) => transaction.note ?? "",
        formatTimestamp: (value) => value,
        onLoadMore: vi.fn(),
      },
    });

    expect(screen.getByText("2026年1月")).toBeTruthy();
    expect(screen.getByText("2025年12月")).toBeTruthy();

    await user.type(screen.getByRole("searchbox", { name: "搜索交易" }), "文具");
    expect(screen.queryByText("零花钱")).toBeNull();
    expect(screen.getByText("购买文具")).toBeTruthy();

    await user.clear(screen.getByRole("searchbox", { name: "搜索交易" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "交易类型" }), "deposit");
    expect(screen.getByText("零花钱")).toBeTruthy();
    expect(screen.queryByText("购买文具")).toBeNull();
  });

  it("moves focus into the void dialog and restores it when closed", async () => {
    const user = userEvent.setup();
    render(TransactionsList, {
      props: {
        transactions: [baseTransaction],
        hasMore: false,
        loading: false,
        canVoid: true,
        transactionLabels: {
          deposit: "存入",
          withdrawal: "取出",
          transfer_in: "转入",
          transfer_out: "转出",
          interest: "利息",
        },
        formatSignedAmount: () => "+10.00 CNY",
        transactionTone: () => "text-emerald-600",
        getTransactionNote: () => "测试",
        formatTimestamp: () => "now",
        onLoadMore: vi.fn(),
        onVoidTransaction: vi.fn(),
      },
    });

    const trigger = screen.getByRole("button", { name: /^更多操作：/ });
    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "撤销交易" }));
    const cancel = screen.getByRole("button", { name: "取消" });
    expect(document.activeElement).toBe(cancel);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("shows the selected transaction for review and cancels without voiding it", async () => {
    const user = userEvent.setup();
    const onVoidTransaction = vi.fn();
    render(TransactionsList, {
      props: {
        transactions: [baseTransaction], hasMore: false, loading: false, canVoid: true,
        transactionLabels: { deposit: "存入", withdrawal: "取出", transfer_in: "转入", transfer_out: "转出", interest: "利息" },
        formatSignedAmount: () => "+10.00 CNY", transactionTone: () => "text-emerald-600",
        getTransactionNote: () => "家务奖励", getTransactionContext: () => "小乐 · 零花钱 · CNY",
        formatTimestamp: () => "2026/9/30 12:00", onLoadMore: vi.fn(), onVoidTransaction,
      },
    });
    await user.click(screen.getByRole("button", { name: /^更多操作：/ }));
    await user.click(screen.getByRole("button", { name: "撤销交易" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(screen.getByRole("dialog")).toHaveAccessibleDescription(/小乐.*10.00 CNY.*家务奖励.*2026\/9\/30/);
    for (const text of ["小乐 · 零花钱 · CNY", "+10.00 CNY", "家务奖励", "2026/9/30 12:00"]) {
      expect(dialog.getByText(text)).toBeInTheDocument();
    }
    expect(dialog.queryByText(/同时撤销转出和转入/)).toBeNull();
    await user.click(dialog.getByRole("button", { name: "取消" }));
    expect(onVoidTransaction).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("TransactionsList loading and search feedback", () => {
  const props = {
    transactions: [baseTransaction], hasMore: true, loading: false,
    transactionLabels: { deposit: "存入", withdrawal: "取出", transfer_in: "转入", transfer_out: "转出", interest: "利息" },
    formatSignedAmount: () => "+10.00 CNY", transactionTone: () => "text-emerald-600",
    getTransactionNote: (transaction: Transaction) => transaction.note ?? "",
    formatTimestamp: () => "now", onLoadMore: vi.fn(),
  };

  it("distinguishes initial loading from an empty account", async () => {
    const { rerender } = render(TransactionsList, { props: { ...props, transactions: [], loading: true } });
    expect(screen.getByRole("status")).toHaveTextContent("正在加载交易记录");
    expect(screen.queryByText("暂无交易")).toBeNull();
    await rerender({ loading: false });
    expect(screen.getByText("暂无交易")).toBeTruthy();
  });

  it("explains partial search results and lets users load more without losing the query", async () => {
    const user = userEvent.setup();
    render(TransactionsList, { props });
    await user.type(screen.getByRole("searchbox", { name: "搜索交易" }), "书");
    expect(screen.getByRole("status")).toHaveTextContent("找到 0 笔");
    expect(screen.getByText("已加载记录中没有匹配的交易")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "加载更多" }));
    expect(props.onLoadMore).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("searchbox")).toHaveValue("书");
    await user.click(screen.getByRole("button", { name: "清除筛选" }));
    expect(screen.getByText("测试")).toBeTruthy();
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });
  it("offers full-history search, retains the query and reports completion only after all pages load", async () => {
    const user = userEvent.setup();
    const onLoadAll = vi.fn();
    const { rerender } = render(TransactionsList, { props: { ...props, onLoadAll } });
    expect(screen.queryByRole("button", { name: "搜索全部历史" })).toBeNull();
    await user.type(screen.getByRole("searchbox"), "书");
    await user.click(screen.getByRole("button", { name: "搜索全部历史" }));
    expect(onLoadAll).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(screen.getByRole("searchbox"));
    await rerender({ loading: true });
    expect(screen.getByRole("button", { name: "正在加载历史…" })).toBeDisabled();
    await rerender({ loading: false, hasMore: false, transactions: [baseTransaction, { ...baseTransaction, id: "old", note: "买书" }] });
    expect(screen.getByRole("searchbox")).toHaveValue("书");
    expect(screen.getByRole("status")).toHaveTextContent("找到 1 笔 · 已加载全部交易记录。");
    expect(screen.getByText("买书")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "搜索全部历史" })).toBeNull();
  });

});

describe('TransactionsList note actions', () => {
  const noteProps = () => ({
    transactions: [{ ...baseTransaction, user_note: '测试', note_revision: 0 }], hasMore: true, loading: false, canVoid: true,
    transactionLabels: { deposit: '存入', withdrawal: '取出', transfer_in: '转入', transfer_out: '转出', interest: '利息' },
    formatSignedAmount: () => '+10.00 CNY', transactionTone: () => 'text-emerald-600',
    getTransactionNote: (row: Transaction) => row.note ?? '—', formatTimestamp: (value: string) => value,
    onLoadMore: vi.fn(), onVoidTransaction: vi.fn(),
    onUpdateNote: vi.fn(async () => ({ ok: true as const, transactions: [] })),
    onLoadNoteHistory: vi.fn(async () => ({ ok: true as const, edits: [] })),
  });
  it('opens the editor from the menu and restores focus, filters and loaded rows after saving', async () => {
    const user = userEvent.setup();
    const props = noteProps();
    render(TransactionsList, { props });
    await user.type(screen.getByRole('searchbox'), '测试');
    const trigger = screen.getByRole('button', { name: /^更多操作：/ });
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('button', { name: '修改备注' }));
    expect(screen.getByRole('heading', { name: '修改备注' })).toBeInTheDocument();
    await user.clear(screen.getByRole('textbox', { name: '备注' }));
    await user.type(screen.getByRole('textbox', { name: '备注' }), '测试修正');
    await user.click(screen.getByRole('button', { name: '保存' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(trigger).toHaveFocus();
    expect(screen.getByRole('searchbox')).toHaveValue('测试');
    expect(screen.getByRole('button', { name: '加载更多' })).toBeInTheDocument();
    expect(props.onVoidTransaction).not.toHaveBeenCalled();
  });
  it('offers children read-only history and keeps interest transactions read-only', async () => {
    const user = userEvent.setup();
    const props = noteProps();
    const { rerender } = render(TransactionsList, { props: { ...props, canVoid: false,
      transactions: [{ ...baseTransaction, note_revision: 1 }] } });
    expect(screen.queryByRole('button', { name: /^更多操作：/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: /^查看备注修改记录/ }));
    expect(screen.getByRole('heading', { name: '备注修改记录' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
    await user.click(screen.getByRole('button', { name: '关闭' }));
    await rerender({ canVoid: true, transactions: [{ ...baseTransaction, type: 'interest' }] });
    expect(screen.queryByRole('button', { name: /^更多操作：/ })).toBeNull();
    expect(screen.queryByRole('button', { name: '修改备注' })).toBeNull();
    expect(screen.queryByRole('button', { name: '撤销交易' })).toBeNull();
    expect(screen.queryByText('只读')).toBeNull();
    vi.useFakeTimers();
    try {
      await fireEvent.pointerDown(screen.getByText('利息', { selector: 'span' }).closest('li') as Element, { clientX: 10, clientY: 10 });
      vi.advanceTimersByTime(600);
      await nextTick();
      expect(screen.queryByRole('group', { name: '交易操作' })).toBeNull();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(props.onVoidTransaction).not.toHaveBeenCalled();
      expect(props.onUpdateNote).not.toHaveBeenCalled();
    } finally { vi.useRealTimers(); }
  });
  it('closes the actions with Escape and leaves no edit entry on voided rows', async () => {
    const user = userEvent.setup();
    const props = noteProps();
    const { rerender } = render(TransactionsList, { props });
    const trigger = screen.getByRole('button', { name: /^更多操作：/ });
    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('group', { name: '交易操作' })).toBeNull();
    expect(trigger).toHaveFocus();
    await rerender({ transactions: [{ ...baseTransaction, is_void: true }] });
    expect(screen.queryByRole('button', { name: /^更多操作：/ })).toBeNull();
  });
});
