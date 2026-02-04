import { render, screen } from "@testing-library/vue";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import AccountListPanel from "../components/AccountListPanel.vue";

describe("AccountListPanel", () => {
  it("shows empty hint when no child is selected", () => {
    render(AccountListPanel, {
      props: {
        selectedChildId: null,
        selectedChildName: null,
        childUsers: [],
        selectedChildAccounts: [],
        selectedAccountId: null,
        balances: {},
        supportedCurrencies: ["CNY"],
        newAccountName: "",
        newAccountCurrency: "CNY",
        newAccountOwnerId: "",
        showAccountCreator: false,
        loading: false,
        editingAccountId: null,
        editingAccountName: "",
        formatAmount: () => "0.00 CNY",
        onCreateAccount: vi.fn(),
        onSelectAccount: vi.fn(),
        onStartEditAccount: vi.fn(),
        onUpdateAccount: vi.fn(),
        onCancelEditAccount: vi.fn(),
        onCloseAccount: vi.fn(),
      },
    });

    expect(screen.getByText("请选择孩子查看账户。")).toBeTruthy();
  });

  it("creates and edits accounts when child is selected", async () => {
    const user = userEvent.setup();
    const onCreateAccount = vi.fn();
    const onSelectAccount = vi.fn();
    const onStartEditAccount = vi.fn();
    const onUpdateAccount = vi.fn();
    const onCancelEditAccount = vi.fn();
    const onCloseAccount = vi.fn();
    const onUpdateName = vi.fn();
    const onUpdateCurrency = vi.fn();
    const onUpdateOwnerId = vi.fn();
    const onUpdateShow = vi.fn();
    const onUpdateEditingName = vi.fn();

    const { rerender } = render(AccountListPanel, {
      props: {
        selectedChildId: "child-1",
        selectedChildName: "小乐",
        childUsers: [{ id: "child-1", name: "小乐", role: "child" }],
        selectedChildAccounts: [
          {
            id: "acc-1",
            name: "零钱",
            currency: "CNY",
            owner_child_id: "child-1",
            created_by: "parent",
            is_active: true,
          },
        ],
        selectedAccountId: null,
        balances: { "acc-1": 10 },
        supportedCurrencies: ["CNY"],
        newAccountName: "",
        newAccountCurrency: "CNY",
        newAccountOwnerId: "",
        showAccountCreator: false,
        loading: false,
        editingAccountId: null,
        editingAccountName: "",
        formatAmount: () => "10.00 CNY",
        onCreateAccount,
        onSelectAccount,
        onStartEditAccount,
        onUpdateAccount,
        onCancelEditAccount,
        onCloseAccount,
        "onUpdate:newAccountName": onUpdateName,
        "onUpdate:newAccountCurrency": onUpdateCurrency,
        "onUpdate:newAccountOwnerId": onUpdateOwnerId,
        "onUpdate:showAccountCreator": onUpdateShow,
        "onUpdate:editingAccountName": onUpdateEditingName,
      },
    });

    await user.click(screen.getByRole("button", { name: "创建账户" }));
    expect(onUpdateShow).toHaveBeenLastCalledWith(true);

    await rerender({
      selectedChildId: "child-1",
      selectedChildName: "小乐",
      childUsers: [{ id: "child-1", name: "小乐", role: "child" }],
      selectedChildAccounts: [
        {
          id: "acc-1",
          name: "零钱",
          currency: "CNY",
          owner_child_id: "child-1",
          created_by: "parent",
          is_active: true,
        },
      ],
      selectedAccountId: null,
      balances: { "acc-1": 10 },
      supportedCurrencies: ["CNY"],
      newAccountName: "",
      newAccountCurrency: "CNY",
      newAccountOwnerId: "",
      showAccountCreator: true,
      loading: false,
      editingAccountId: null,
      editingAccountName: "",
      formatAmount: () => "10.00 CNY",
      onCreateAccount,
      onSelectAccount,
      onStartEditAccount,
      onUpdateAccount,
      onCancelEditAccount,
      onCloseAccount,
      "onUpdate:newAccountName": onUpdateName,
      "onUpdate:newAccountCurrency": onUpdateCurrency,
      "onUpdate:newAccountOwnerId": onUpdateOwnerId,
      "onUpdate:showAccountCreator": onUpdateShow,
      "onUpdate:editingAccountName": onUpdateEditingName,
    });

    await user.type(screen.getByPlaceholderText("账户名称"), "学习金");
    expect(onUpdateName).toHaveBeenLastCalledWith("学习金");

    const selects = screen.getAllByRole("combobox");
    await user.selectOptions(selects[0], "CNY");
    expect(onUpdateCurrency).toHaveBeenLastCalledWith("CNY");

    await user.selectOptions(selects[1], "child-1");
    expect(onUpdateOwnerId).toHaveBeenLastCalledWith("child-1");

    await user.click(screen.getByRole("button", { name: "创建" }));
    expect(onCreateAccount).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /零钱/ }));
    expect(onSelectAccount).toHaveBeenCalledWith("acc-1");

    await user.click(screen.getByRole("button", { name: "编辑" }));
    expect(onStartEditAccount).toHaveBeenCalledWith(
      expect.objectContaining({ id: "acc-1" }),
    );

    render(AccountListPanel, {
      props: {
        selectedChildId: "child-1",
        selectedChildName: "小乐",
        childUsers: [{ id: "child-1", name: "小乐", role: "child" }],
        selectedChildAccounts: [
          {
            id: "acc-1",
            name: "零钱",
            currency: "CNY",
            owner_child_id: "child-1",
            created_by: "parent",
            is_active: true,
          },
        ],
        selectedAccountId: "acc-1",
        balances: { "acc-1": 10 },
        supportedCurrencies: ["CNY"],
        newAccountName: "",
        newAccountCurrency: "CNY",
        newAccountOwnerId: "",
        showAccountCreator: false,
        loading: false,
        editingAccountId: "acc-1",
        editingAccountName: "零钱",
        formatAmount: () => "10.00 CNY",
        onCreateAccount,
      onSelectAccount,
      onStartEditAccount,
      onUpdateAccount,
      onCancelEditAccount,
      onCloseAccount,
        "onUpdate:newAccountName": onUpdateName,
        "onUpdate:newAccountCurrency": onUpdateCurrency,
        "onUpdate:newAccountOwnerId": onUpdateOwnerId,
        "onUpdate:showAccountCreator": onUpdateShow,
        "onUpdate:editingAccountName": onUpdateEditingName,
      },
    });

    await user.type(screen.getByDisplayValue("零钱"), "2");
    expect(onUpdateEditingName).toHaveBeenLastCalledWith("零钱2");

    await user.click(screen.getByRole("button", { name: "保存" }));
    expect(onUpdateAccount).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(onCancelEditAccount).toHaveBeenCalled();
  });

  it("shows close account button only when editing and balance is zero", async () => {
    const user = userEvent.setup();
    const onCloseAccount = vi.fn();

    const { rerender } = render(AccountListPanel, {
      props: {
        selectedChildId: "child-1",
        selectedChildName: "小乐",
        childUsers: [{ id: "child-1", name: "小乐", role: "child" }],
        selectedChildAccounts: [
          {
            id: "acc-1",
            name: "专项",
            currency: "CNY",
            owner_child_id: "child-1",
            created_by: "parent",
            is_active: true,
          },
        ],
        selectedAccountId: "acc-1",
        balances: { "acc-1": 0 },
        supportedCurrencies: ["CNY"],
        newAccountName: "",
        newAccountCurrency: "CNY",
        newAccountOwnerId: "",
        showAccountCreator: false,
        loading: false,
        editingAccountId: "acc-1",
        editingAccountName: "专项",
        formatAmount: () => "0.00 CNY",
        onCreateAccount: vi.fn(),
        onSelectAccount: vi.fn(),
        onStartEditAccount: vi.fn(),
        onUpdateAccount: vi.fn(),
        onCancelEditAccount: vi.fn(),
        onCloseAccount,
      },
    });

    await user.click(screen.getByRole("button", { name: "关闭账户" }));
    expect(onCloseAccount).toHaveBeenCalledWith(
      expect.objectContaining({ id: "acc-1" }),
    );

    await rerender({
      selectedChildId: "child-1",
      selectedChildName: "小乐",
      childUsers: [{ id: "child-1", name: "小乐", role: "child" }],
      selectedChildAccounts: [
        {
          id: "acc-1",
          name: "专项",
          currency: "CNY",
          owner_child_id: "child-1",
          created_by: "parent",
          is_active: true,
        },
      ],
      selectedAccountId: "acc-1",
      balances: { "acc-1": 0.01 },
      supportedCurrencies: ["CNY"],
      newAccountName: "",
      newAccountCurrency: "CNY",
      newAccountOwnerId: "",
      showAccountCreator: false,
      loading: false,
      editingAccountId: "acc-1",
      editingAccountName: "专项",
      formatAmount: () => "0.01 CNY",
      onCreateAccount: vi.fn(),
      onSelectAccount: vi.fn(),
      onStartEditAccount: vi.fn(),
      onUpdateAccount: vi.fn(),
      onCancelEditAccount: vi.fn(),
      onCloseAccount,
    });

    expect(screen.queryByRole("button", { name: "关闭账户" })).toBeNull();
  });
});
