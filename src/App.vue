<template>
  <main
    v-if="!user"
    class="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-500 px-4"
  >
    <div
      class="w-full max-w-2xl rounded-3xl bg-white/90 p-8 text-center shadow-2xl backdrop-blur"
    >
      <h1 class="text-2xl font-semibold text-slate-900">Home Bank</h1>
      <p class="mt-2 text-sm text-slate-600">请选择用户并输入 PIN。</p>
      <span
        v-if="!isSupabaseConfigured"
        class="mt-6 block text-sm text-rose-600"
      >
        请先配置 Supabase 连接。
      </span>
      <span
        v-else-if="loginUsers.length === 0"
        class="mt-6 block text-sm text-slate-500"
      >
        暂无用户，请先创建家庭成员。
      </span>
      <template v-else>
        <div class="mt-6 grid gap-4 sm:grid-cols-2">
          <button
            v-for="entry in loginUsers"
            :key="entry.id"
            type="button"
            :aria-label="entry.name"
            :class="[
              'flex items-center gap-4 rounded-3xl border px-4 py-3 text-left transition',
              entry.id === selectedLoginUserId
                ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-200'
                : 'border-white/60 bg-white shadow-sm hover:bg-brand-50',
            ]"
            @click="selectLoginUser(entry.id)"
          >
            <Avatar
              :avatar-id="entry.avatar_id"
              :options="avatarOptions"
              :role="entry.role"
              class="h-16 w-16"
            />
            <div>
              <p class="text-lg font-semibold text-slate-800">
                {{ entry.name }}
              </p>
              <p class="text-sm text-slate-500">
                {{ entry.role === "parent" ? "家长" : "孩子" }}
              </p>
            </div>
          </button>
        </div>

        <form class="mt-6 space-y-4" @submit.prevent="handleLogin">
          <input
            v-model="loginPin"
            type="password"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="4"
            placeholder="PIN"
            class="w-full rounded-2xl border border-white/60 bg-white px-4 py-3 text-center text-2xl tracking-[0.3em] text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            @input="loginPin = sanitizePin(loginPin)"
          />
          <button
            type="submit"
            :disabled="loading"
            class="w-full rounded-2xl bg-brand-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{
              loading
                ? "登录中..."
                : selectedLoginUser
                  ? `登录 ${selectedLoginUser.name}`
                  : "登录"
            }}
          </button>
        </form>
      </template>
      <span
        v-if="sessionStatus || status"
        class="mt-3 block text-sm text-rose-600"
      >
        {{ sessionStatus ?? status }}
      </span>
    </div>
  </main>

  <div v-else class="flex min-h-screen flex-col">
    <header
      class="flex flex-wrap items-center justify-between gap-4 bg-brand-600 px-6 py-4 text-white shadow-lg"
    >
      <div class="flex items-center gap-4">
        <Avatar
          :avatar-id="user.avatar_id"
          :options="avatarOptions"
          :role="user.role"
          class="h-16 w-16"
        />
        <div>
          <h2 class="text-xl font-semibold">{{ user.name }}</h2>
          <span class="text-sm text-white/80">Home Bank</span>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <button
          v-if="canEdit"
          type="button"
          class="rounded-full bg-white/20 px-4 py-1 text-sm font-semibold text-white transition hover:bg-white/30"
          @click="showChildManager = !showChildManager"
        >
          {{ showChildManager ? "关闭孩子管理" : "管理孩子" }}
        </button>
        <span class="rounded-full bg-white/30 px-3 py-1 text-xs font-semibold">
          {{ user.role === "parent" ? "家长" : "孩子" }}
        </span>
        <button
          class="rounded-full bg-white px-4 py-1 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-100"
          @click="handleLogout"
        >
          退出
        </button>
      </div>
    </header>

    <main v-if="user.role === 'parent'" class="flex-1 space-y-6 px-6 py-6">
      <section
        v-if="showChildManager"
        class="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg backdrop-blur"
        data-testid="child-card"
      >
        <h4 class="text-sm font-semibold text-slate-700">孩子管理</h4>
        <div class="mt-4 flex flex-col gap-3 lg:flex-row">
          <input
            v-model="newChildName"
            type="text"
            placeholder="孩子姓名"
            class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <input
            v-model="newChildPin"
            type="password"
            inputmode="numeric"
            pattern="[0-9]*"
            maxlength="4"
            placeholder="PIN（4 位）"
            class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-center text-sm tracking-[0.25em] focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            @input="newChildPin = sanitizePin(newChildPin)"
          />
        </div>
        <div class="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <button
            v-for="avatar in childAvatars"
            :key="avatar.id"
            type="button"
            :class="[
              'flex flex-col items-center gap-3 rounded-3xl border px-4 py-3 text-sm transition',
              avatar.id === newChildAvatarId
                ? 'border-brand-400 bg-brand-50 ring-2 ring-brand-200'
                : 'border-white/60 bg-white shadow-sm hover:bg-brand-50',
            ]"
            @click="newChildAvatarId = avatar.id"
          >
            <Avatar
              :avatar-id="avatar.id"
              :options="avatarOptions"
              role="child"
              class="h-16 w-16"
            />
            <span class="text-slate-600">{{ avatar.label }}</span>
          </button>
        </div>
        <button
          class="mt-4 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="loading"
          @click="handleCreateChild"
        >
          创建孩子
        </button>
        <ul
          v-if="childUsers.length > 0"
          class="mt-4 space-y-2 text-sm text-slate-700"
        >
          <li
            v-for="child in childUsers"
            :key="child.id"
            class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3"
          >
            <div class="flex items-center gap-4">
              <Avatar
                :avatar-id="child.avatar_id"
                :options="avatarOptions"
                role="child"
                class="h-16 w-16"
              />
              <input
                v-if="editingChildId === child.id"
                v-model="editingChildName"
                type="text"
                class="w-40 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <span v-else class="text-base font-semibold">{{
                child.name
              }}</span>
            </div>
            <div class="flex items-center gap-2">
              <template v-if="editingChildId === child.id">
                <button
                  type="button"
                  class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200"
                  :disabled="loading"
                  @click="handleUpdateChild"
                >
                  保存
                </button>
                <button
                  type="button"
                  class="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-300"
                  :disabled="loading"
                  @click="cancelEditChild"
                >
                  取消
                </button>
              </template>
              <button
                v-else
                type="button"
                class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
                :disabled="loading"
                @click="startEditChild(child)"
              >
                编辑
              </button>
              <button
                type="button"
                class="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-200"
                :disabled="loading"
                @click="handleDeleteChild(child.id)"
              >
                删除
              </button>
            </div>
          </li>
        </ul>
      </section>

      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="(total, currency) in currencyTotals"
          :key="currency"
          class="rounded-3xl bg-white/90 p-5 text-center shadow-lg backdrop-blur"
        >
          <p
            class="text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            {{ currency }} 资产总览
          </p>
          <p class="mt-3 text-3xl font-semibold text-slate-800">
            {{ formatAmount(total, currency) }}
          </p>
        </div>
      </div>

      <section
        class="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg backdrop-blur"
      >
        <h4 class="text-sm font-semibold text-slate-700">孩子列表</h4>
        <p v-if="childUsers.length === 0" class="mt-3 text-sm text-slate-500">
          暂无孩子，请先创建。
        </p>
        <div v-else class="mt-4 grid grid-cols-2 gap-3">
          <button
            v-for="child in childUsers"
            :key="child.id"
            type="button"
            :class="[
              'relative h-28 flex items-center gap-4 rounded-2xl border px-4 transition-all duration-200',
              selectedChildId === child.id
                ? 'bg-purple-600 text-white shadow-lg ring-2 ring-purple-300 active:scale-95'
                : 'border-gray-200 bg-white shadow-sm hover:bg-purple-50 active:scale-95',
            ]"
            @click="selectedChildId = child.id"
          >
            <Avatar
              :avatar-id="child.avatar_id"
              :options="avatarOptions"
              role="child"
              :class="[
                'h-16 w-16 shrink-0',
                selectedChildId === child.id ? 'bg-white/20' : '',
              ]"
            />
            <span
              :class="[
                'text-lg font-semibold',
                selectedChildId === child.id ? 'text-white' : 'text-slate-800',
              ]"
              >{{ child.name }}</span
            >
            <span
              v-if="selectedChildId === child.id"
              class="absolute top-2 right-2 rounded-full bg-white/20 px-2 py-0.5 text-xs text-white"
            >
              当前
            </span>
          </button>
        </div>
      </section>

      <section
        class="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg backdrop-blur"
      >
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-semibold text-slate-700">账户列表</h4>
          <span
            v-if="selectedChild"
            class="text-xs font-semibold text-slate-400"
          >
            {{ selectedChild?.name }}
          </span>
        </div>

        <div
          v-if="selectedChildId"
          class="mt-4 rounded-2xl border border-dashed border-brand-200 bg-white/70 p-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h5 class="text-sm font-semibold text-slate-600">创建账户</h5>
            <button
              type="button"
              class="rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-brand-700"
              @click="showAccountCreator = !showAccountCreator"
            >
              {{ showAccountCreator ? "收起" : "创建账户" }}
            </button>
          </div>
          <div v-if="showAccountCreator" class="mt-4">
            <div class="flex flex-col gap-3 lg:flex-row">
              <input
                v-model="newAccountName"
                type="text"
                placeholder="账户名称"
                class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              <select
                v-model="newAccountCurrency"
                class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option
                  v-for="currency in supportedCurrencies"
                  :key="currency"
                  :value="currency"
                >
                  {{ currency }}
                </option>
              </select>
            </div>
            <div class="mt-3 flex flex-col gap-3 lg:flex-row">
              <select
                v-model="newAccountOwnerId"
                class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 sm:w-40"
              >
                <option value="">选择孩子</option>
                <option
                  v-for="child in childUsers"
                  :key="child.id"
                  :value="child.id"
                >
                  {{ child.name }}
                </option>
              </select>
              <button
                class="min-w-[96px] rounded-2xl bg-sky-500 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="loading"
                @click="handleCreateAccount"
              >
                创建
              </button>
            </div>
          </div>
        </div>

        <template v-if="selectedChildId">
          <p
            v-if="selectedChildAccounts.length === 0"
            class="mt-4 text-sm text-slate-500"
          >
            该孩子暂无账户。
          </p>
          <div v-else class="mt-4 grid gap-3 md:grid-cols-2">
            <div
              v-for="account in selectedChildAccounts"
              :key="account.id"
              :class="[
                'flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition',
                account.id === selectedAccountId
                  ? 'border-purple-300 bg-purple-50 text-purple-700 shadow-md ring-2 ring-purple-200'
                  : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md',
              ]"
            >
              <button
                type="button"
                class="flex flex-1 flex-col text-left"
                @click="selectAccount(account.id)"
              >
                <input
                  v-if="editingAccountId === account.id"
                  v-model="editingAccountName"
                  type="text"
                  class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
                <template v-else>
                  <p>{{ account.name }}</p>
                  <p class="text-xs text-slate-400">{{ account.currency }}</p>
                </template>
              </button>
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-slate-500">
                  {{
                    formatAmount(balances[account.id] ?? 0, account.currency)
                  }}
                </span>
                <template v-if="editingAccountId === account.id">
                  <button
                    type="button"
                    class="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200"
                    :disabled="loading"
                    @click="handleUpdateAccount"
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    class="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-300"
                    :disabled="loading"
                    @click="cancelEditAccount"
                  >
                    取消
                  </button>
                </template>
                <button
                  v-else
                  type="button"
                  class="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
                  :disabled="loading"
                  @click="startEditAccount(account)"
                >
                  编辑
                </button>
              </div>
            </div>
          </div>
        </template>
        <p v-else class="mt-3 text-sm text-slate-500">请选择孩子查看账户。</p>
      </section>

      <template v-if="selectedAccount">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <template v-if="editingAccountId === selectedAccount.id">
              <div class="flex flex-col gap-2">
                <input
                  v-model="editingAccountName"
                  type="text"
                  class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-base font-semibold text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
                <div class="flex gap-2">
                  <button
                    type="button"
                    class="rounded-full bg-emerald-100 px-4 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200"
                    :disabled="loading"
                    @click="handleUpdateAccount"
                  >
                    保存名称
                  </button>
                  <button
                    type="button"
                    class="rounded-full bg-slate-200 px-4 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-300"
                    :disabled="loading"
                    @click="cancelEditAccount"
                  >
                    取消
                  </button>
                </div>
              </div>
            </template>
            <template v-else>
              <h3 class="text-lg font-semibold text-slate-800">
                {{ selectedAccount.name }}
              </h3>
              <p class="text-sm text-slate-500">
                币种 {{ selectedAccount.currency }} · 余额
                {{
                  formatAmount(
                    balances[selectedAccount.id] ?? 0,
                    selectedAccount.currency,
                  )
                }}
              </p>
            </template>
          </div>
        </div>

        <div
          class="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg backdrop-blur"
        >
          <div class="flex items-center justify-between">
            <div>
              <h4 class="text-sm font-semibold text-slate-700">
                近 30 天余额趋势
              </h4>
              <p class="text-xs text-slate-400">按日累计余额</p>
            </div>
            <span class="text-xs font-semibold text-brand-600">{{
              selectedAccount.currency
            }}</span>
          </div>
          <div class="mt-4 h-32">
            <svg v-if="chartPath" viewBox="0 0 100 100" class="h-full w-full">
              <path
                :d="chartPath"
                fill="none"
                stroke="url(#sparkline)"
                stroke-width="3"
                stroke-linecap="round"
              />
              <defs>
                <linearGradient id="sparkline" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stop-color="#f97316" />
                  <stop offset="50%" stop-color="#a855f7" />
                  <stop offset="100%" stop-color="#38bdf8" />
                </linearGradient>
              </defs>
            </svg>
            <p v-else class="text-sm text-slate-400">暂无数据</p>
          </div>
        </div>

        <section
          v-if="canEdit"
          class="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg backdrop-blur"
        >
          <div class="flex flex-wrap items-center justify-between gap-2">
            <h4 class="text-sm font-semibold text-slate-700">新增/扣减</h4>
            <span
              v-if="selectedChild"
              class="text-xs font-semibold text-slate-400"
            >
              当前：{{ selectedChild.name }} ·
              {{ selectedAccount?.name ?? "未选择账户" }}
            </span>
          </div>

          <div class="mt-4 flex flex-col gap-3 lg:flex-row">
            <input
              v-model="amountInput"
              type="number"
              min="0"
              step="0.01"
              placeholder="金额"
              class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <input
              v-model="noteInput"
              type="text"
              placeholder="备注（可选）"
              class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div class="mt-3 flex flex-wrap gap-3">
            <button
              class="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="loading"
              @click="handleAddTransaction('deposit')"
            >
              增加
            </button>
            <button
              class="rounded-2xl bg-rose-400 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="loading"
              @click="handleAddTransaction('withdrawal')"
            >
              减少
            </button>
          </div>
        </section>

        <section
          v-if="canEdit"
          class="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg backdrop-blur"
          data-testid="transfer-card"
        >
          <h4 class="text-sm font-semibold text-slate-700">同币种转账</h4>
          <div class="mt-4 flex flex-col gap-3 lg:flex-row">
            <input
              v-model="transferAmount"
              type="number"
              min="0"
              step="0.01"
              placeholder="转账金额"
              class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <select
              v-model="transferTargetId"
              class="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              <option value="">选择转入账户</option>
              <option
                v-for="account in transferTargets"
                :key="account.id"
                :value="account.id"
              >
                {{ account.ownerName }} - {{ account.name }}
              </option>
            </select>
          </div>
          <p class="mt-3 text-xs text-slate-500">
            可转账余额：{{
              formatAmount(
                balances[selectedAccount.id] ?? 0,
                selectedAccount.currency,
              )
            }}
          </p>
          <button
            class="mt-3 rounded-2xl bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="loading"
            @click="handleTransfer"
          >
            确认转账
          </button>
        </section>

        <section
          class="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg backdrop-blur"
        >
          <h4 class="text-sm font-semibold text-slate-700">交易记录</h4>
          <p
            v-if="selectedTransactions.length === 0"
            class="mt-3 text-sm text-slate-500"
          >
            暂无交易。
          </p>
          <template v-else>
            <ul class="mt-4 space-y-3">
              <li
                v-for="transaction in pagedTransactions"
                :key="transaction.id"
                class="flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-slate-700"
              >
                <TransactionIcon :type="transaction.type" />
                <div class="flex-1">
                  <div class="flex items-center justify-between">
                    <div>
                      <span class="font-semibold">{{
                        transactionLabels[transaction.type]
                      }}</span>
                      <span class="ml-2 text-slate-500">{{
                        getTransactionNote(transaction)
                      }}</span>
                    </div>
                    <span
                      :class="['font-semibold', transactionTone(transaction)]"
                    >
                      {{ formatSignedAmount(transaction) }}
                    </span>
                  </div>
                  <div class="mt-2 text-xs text-slate-400">
                    {{ formatTimestamp(transaction.created_at) }}
                  </div>
                </div>
              </li>
            </ul>
            <button
              v-if="hasMoreTransactions"
              class="mt-4 w-full rounded-2xl border border-brand-200 bg-white/80 px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"
              @click="visibleTransactions += 10"
            >
              加载更多
            </button>
          </template>
        </section>
      </template>
      <p v-else class="text-sm text-slate-500">暂无账户。</p>
    </main>

    <div v-else class="flex flex-1 flex-col lg:flex-row">
      <div class="order-1 space-y-6 px-6 py-6">
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="(total, currency) in currencyTotals"
            :key="currency"
            class="rounded-3xl bg-white/90 p-5 text-center shadow-lg backdrop-blur"
          >
            <p
              class="text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              {{ currency }} 资产总览
            </p>
            <p class="mt-3 text-3xl font-semibold text-slate-800">
              {{ formatAmount(total, currency) }}
            </p>
          </div>
        </div>
      </div>

      <aside
        class="order-2 border-t border-white/60 bg-white/80 px-6 py-5 backdrop-blur lg:order-1 lg:w-72 lg:border-t-0 lg:border-r"
      >
        <h3 class="text-sm font-semibold text-slate-600">账户</h3>
        <div class="mt-4 space-y-4">
          <div
            v-for="(currencyAccounts, currency) in groupedAccounts"
            :key="currency"
          >
            <h4
              class="text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              {{ currency }}
            </h4>
            <div
              class="mt-2 flex flex-col gap-3 sm:flex-row sm:overflow-x-auto sm:pb-2 lg:block lg:space-y-2 lg:overflow-visible"
            >
              <button
                v-for="account in currencyAccounts"
                :key="account.id"
                class="flex w-full min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition sm:min-w-[220px]"
                :class="
                  account.id === selectedAccountId
                    ? 'border-purple-300 bg-purple-50 text-purple-700 shadow-md ring-2 ring-purple-200'
                    : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md'
                "
                @click="selectAccount(account.id)"
              >
                <span class="flex-1 break-words">{{ account.name }}</span>
                <span class="text-xs font-semibold text-slate-500">
                  {{
                    formatAmount(balances[account.id] ?? 0, account.currency)
                  }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <section class="order-3 flex-1 space-y-6 px-6 py-6 lg:order-2">
        <template v-if="selectedAccount">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 class="text-lg font-semibold text-slate-800">
                {{ selectedAccount.name }}
              </h3>
              <p class="text-sm text-slate-500">
                币种 {{ selectedAccount.currency }} · 余额
                {{
                  formatAmount(
                    balances[selectedAccount.id] ?? 0,
                    selectedAccount.currency,
                  )
                }}
              </p>
            </div>
          </div>

          <div
            class="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg backdrop-blur"
          >
            <div class="flex items-center justify-between">
              <div>
                <h4 class="text-sm font-semibold text-slate-700">
                  近 30 天余额趋势
                </h4>
                <p class="text-xs text-slate-400">按日累计余额</p>
              </div>
              <span class="text-xs font-semibold text-brand-600">{{
                selectedAccount.currency
              }}</span>
            </div>
            <div class="mt-4 h-32">
              <svg v-if="chartPath" viewBox="0 0 100 100" class="h-full w-full">
                <path
                  :d="chartPath"
                  fill="none"
                  stroke="url(#sparkline)"
                  stroke-width="3"
                  stroke-linecap="round"
                />
                <defs>
                  <linearGradient id="sparkline" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stop-color="#f97316" />
                    <stop offset="50%" stop-color="#a855f7" />
                    <stop offset="100%" stop-color="#38bdf8" />
                  </linearGradient>
                </defs>
              </svg>
              <p v-else class="text-sm text-slate-400">暂无数据</p>
            </div>
          </div>

          <div
            class="rounded-3xl border border-white/80 bg-white/90 p-5 shadow-lg backdrop-blur"
          >
            <h4 class="text-sm font-semibold text-slate-700">交易记录</h4>
            <p
              v-if="selectedTransactions.length === 0"
              class="mt-3 text-sm text-slate-500"
            >
              暂无交易。
            </p>
            <template v-else>
              <ul class="mt-4 space-y-3">
                <li
                  v-for="transaction in pagedTransactions"
                  :key="transaction.id"
                  class="flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-slate-700"
                >
                  <TransactionIcon :type="transaction.type" />
                  <div class="flex-1">
                    <div class="flex items-center justify-between">
                      <div>
                        <span class="font-semibold">{{
                          transactionLabels[transaction.type]
                        }}</span>
                        <span class="ml-2 text-slate-500">{{
                          getTransactionNote(transaction)
                        }}</span>
                      </div>
                      <span
                        :class="['font-semibold', transactionTone(transaction)]"
                      >
                        {{ formatSignedAmount(transaction) }}
                      </span>
                    </div>
                    <div class="mt-2 text-xs text-slate-400">
                      {{ formatTimestamp(transaction.created_at) }}
                    </div>
                  </div>
                </li>
              </ul>
              <button
                v-if="hasMoreTransactions"
                class="mt-4 w-full rounded-2xl border border-brand-200 bg-white/80 px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm transition hover:bg-brand-50"
                @click="visibleTransactions += 10"
              >
                加载更多
              </button>
            </template>
          </div>
        </template>
        <p v-else class="text-sm text-slate-500">暂无账户。</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { isSupabaseConfigured, supabase } from "./supabaseClient";
import Avatar from "./components/Avatar.vue";
import TransactionIcon from "./components/TransactionIcon.vue";

type Role = "parent" | "child";

type AppUser = {
  id: string;
  name: string;
  role: Role;
  pin: string;
  avatar_id?: string | null;
  created_at?: string;
};

type Account = {
  id: string;
  name: string;
  currency: string;
  owner_child_id: string;
  created_by: string;
  is_active: boolean;
  created_at?: string;
};

type Transaction = {
  id: string;
  account_id: string;
  type: "deposit" | "withdrawal" | "transfer_in" | "transfer_out" | "interest";
  amount: number;
  currency: string;
  note: string | null;
  related_account_id: string | null;
  created_by: string;
  created_at: string;
};

type AvatarOption = {
  id: string;
  label: string;
  role: Role;
  seed: string;
};

type TransferTarget = Account & { ownerName: string };

type ChartPoint = {
  date: Date;
  balance: number;
};

const supportedCurrencies = ["SGD", "CNY"];

const avatarOptions: AvatarOption[] = [
  { id: "parent-1", label: "爸爸", role: "parent", seed: "dad-sunshine" },
  { id: "parent-2", label: "妈妈", role: "parent", seed: "mom-happy" },
  { id: "child-1", label: "男孩", role: "child", seed: "kid-boy" },
  { id: "child-2", label: "女孩", role: "child", seed: "kid-girl" },
  { id: "child-3", label: "幼儿", role: "child", seed: "kid-tiny" },
  { id: "child-4", label: "少年", role: "child", seed: "kid-teen" },
  { id: "child-5", label: "小勇士", role: "child", seed: "kid-hero" },
  { id: "child-6", label: "探索者", role: "child", seed: "kid-explore" },
  { id: "child-7", label: "创意派", role: "child", seed: "kid-creative" },
  { id: "child-8", label: "阳光派", role: "child", seed: "kid-sun" },
  { id: "child-9", label: "运动派", role: "child", seed: "kid-sport" },
  { id: "child-10", label: "学者派", role: "child", seed: "kid-scholar" },
];

const transactionLabels: Record<Transaction["type"], string> = {
  deposit: "增加",
  withdrawal: "减少",
  transfer_in: "转入",
  transfer_out: "转出",
  interest: "利息",
};

const childAvatars = avatarOptions.filter((avatar) => avatar.role === "child");

const sanitizePin = (value: string) => value.replace(/\D/g, "");

const currencyGroups = (accounts: Account[]) => {
  return accounts.reduce<Record<string, Account[]>>((grouped, account) => {
    if (!grouped[account.currency]) {
      grouped[account.currency] = [];
    }
    grouped[account.currency]?.push(account);
    return grouped;
  }, {});
};

const formatAmount = (amount: number, currency: string) => {
  return `${amount.toFixed(2)} ${currency}`;
};

const signedAmount = (transaction: Transaction) => {
  const direction =
    transaction.type === "withdrawal" || transaction.type === "transfer_out"
      ? -1
      : 1;
  return direction * transaction.amount;
};

const computeBalance = (transactions: Transaction[]) => {
  return transactions.reduce(
    (total, transaction) => total + signedAmount(transaction),
    0,
  );
};

const transactionTone = (transaction: Transaction) => {
  return signedAmount(transaction) >= 0 ? "text-emerald-600" : "text-rose-500";
};

const formatSignedAmount = (transaction: Transaction) => {
  const amount = signedAmount(transaction);
  const sign = amount >= 0 ? "+" : "-";
  return `${sign}${Math.abs(amount).toFixed(2)} ${transaction.currency}`;
};

const formatTimestamp = (value: string) => {
  return new Date(value).toLocaleString();
};

const user = ref<AppUser | null>(null);
const loginPin = ref("");
const loginUsers = ref<AppUser[]>([]);
const selectedLoginUserId = ref<string | null>(null);
const accounts = ref<Account[]>([]);
const allTransactions = ref<Transaction[]>([]);
const selectedAccountId = ref<string | null>(null);
const status = ref<string | null>(null);
const loading = ref(false);
let statusTimeoutId: number | null = null;
const amountInput = ref("");
const noteInput = ref("");
const transferAmount = ref("");
const transferTargetId = ref("");
const childUsers = ref<AppUser[]>([]);
const newAccountName = ref("");
const newAccountCurrency = ref("SGD");
const newAccountOwnerId = ref("");
const newChildName = ref("");
const newChildPin = ref("");
const newChildAvatarId = ref(childAvatars[0]?.id ?? "");
const visibleTransactions = ref(10);
const editingChildId = ref<string | null>(null);
const editingChildName = ref("");
const editingAccountId = ref<string | null>(null);
const editingAccountName = ref("");
const sessionStatus = ref<string | null>(null);
const selectedChildId = ref<string | null>(null);
const showChildManager = ref(false);
const showAccountCreator = ref(false);

watch(selectedChildId, (nextChildId, previousChildId) => {
  if (!nextChildId || nextChildId === previousChildId) return;
  showAccountCreator.value = false;
  newAccountName.value = "";
  newAccountCurrency.value = supportedCurrencies[0] ?? "SGD";
});

watch(selectedChildId, () => {
  if (selectedChildId.value) {
    newAccountOwnerId.value = selectedChildId.value;
  }
});
const selectedLoginUser = computed(() => {
  return (
    loginUsers.value.find((entry) => entry.id === selectedLoginUserId.value) ??
    null
  );
});

const selectedAccount = computed(() => {
  return (
    accounts.value.find((account) => account.id === selectedAccountId.value) ??
    null
  );
});

const selectedChild = computed(() => {
  if (user.value?.role === "parent") {
    return (
      childUsers.value.find((child) => child.id === selectedChildId.value) ??
      null
    );
  }

  if (user.value?.role === "child") {
    return user.value;
  }

  return null;
});

const balances = computed(() => {
  return accounts.value.reduce<Record<string, number>>((result, account) => {
    const accountTransactions = allTransactions.value.filter(
      (transaction) => transaction.account_id === account.id,
    );
    result[account.id] = computeBalance(accountTransactions);
    return result;
  }, {});
});

const groupedAccounts = computed(() => currencyGroups(accounts.value));

const currencyTotals = computed(() => {
  return accounts.value.reduce<Record<string, number>>((result, account) => {
    result[account.currency] =
      (result[account.currency] ?? 0) + (balances.value[account.id] ?? 0);
    return result;
  }, {});
});

const selectedChildAccounts = computed(() => {
  if (!selectedChildId.value) return [];
  return accounts.value
    .filter((account) => account.owner_child_id === selectedChildId.value)
    .sort((left, right) =>
      (left.created_at ?? "").localeCompare(right.created_at ?? ""),
    );
});

const canEdit = computed(() => user.value?.role === "parent");

const transferTargets = computed(() => {
  if (!selectedAccount.value) return [] as TransferTarget[];
  return accounts.value
    .filter(
      (account) =>
        account.currency === selectedAccount.value?.currency &&
        account.id !== selectedAccount.value?.id,
    )
    .map((account) => ({
      ...account,
      ownerName:
        childUsers.value.find((child) => child.id === account.owner_child_id)
          ?.name ?? account.name,
    }));
});

const selectedTransactions = computed(() => {
  if (!selectedAccount.value) return [];
  return allTransactions.value
    .filter(
      (transaction) => transaction.account_id === selectedAccount.value?.id,
    )
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() -
        new Date(left.created_at).getTime(),
    );
});

const pagedTransactions = computed(() => {
  return selectedTransactions.value.slice(0, visibleTransactions.value);
});

const hasMoreTransactions = computed(() => {
  return selectedTransactions.value.length > visibleTransactions.value;
});

const chartPoints = computed<ChartPoint[]>(() => {
  if (!selectedAccount.value) return [];
  if (selectedTransactions.value.length === 0) return [];

  const now = new Date(Date.now());
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - 29);

  const accountTransactions = selectedTransactions.value
    .map((transaction) => ({
      transaction,
      effectiveDate: new Date(transaction.created_at),
    }))
    .sort(
      (left, right) =>
        left.effectiveDate.getTime() - right.effectiveDate.getTime(),
    );

  let runningBalance = 0;
  let index = 0;
  const points: ChartPoint[] = [];

  for (let day = 0; day < 30; day += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + day);
    const dayEnd = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59,
      999,
    );

    while (index < accountTransactions.length) {
      const entry = accountTransactions[index];
      if (!entry || entry.effectiveDate > dayEnd) break;
      runningBalance += signedAmount(entry.transaction);
      index += 1;
    }

    points.push({
      date,
      balance: Number(runningBalance.toFixed(2)),
    });
  }

  return points;
});

const chartPath = computed(() => {
  if (chartPoints.value.length < 2) return "";

  const balances = chartPoints.value.map((point) => point.balance);
  const minBalance = Math.min(...balances);
  const maxBalance = Math.max(...balances);
  const range = maxBalance - minBalance || 1;

  return chartPoints.value
    .map((point, index) => {
      const x = (index / (chartPoints.value.length - 1)) * 100;
      const y = 100 - ((point.balance - minBalance) / range) * 100;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
});

const selectLoginUser = (userId: string) => {
  selectedLoginUserId.value = userId;
  loginPin.value = "";
};

const selectAccount = (accountId: string) => {
  selectedAccountId.value = accountId;
};

const loadTransactions = async (loadedAccounts: Account[]) => {
  if (loadedAccounts.length === 0) {
    allTransactions.value = [];
    return;
  }

  const accountIds = loadedAccounts.map((account) => account.id);
  const { data, error } = await supabase
    .from("transactions")
    .select("*")
    .in("account_id", accountIds);

  if (error) {
    status.value = error.message;
    return;
  }

  allTransactions.value = data ?? [];
};

const loadAccounts = async (currentUser: AppUser) => {
  loading.value = true;
  status.value = null;
  const query = supabase.from("accounts").select("*").eq("is_active", true);
  const { data, error } =
    currentUser.role === "parent"
      ? await query.order("created_at")
      : await query.eq("owner_child_id", currentUser.id).order("created_at");

  if (error) {
    status.value = error.message;
    loading.value = false;
    return;
  }

  const loadedAccounts = data ?? [];
  accounts.value = loadedAccounts;
  await loadTransactions(loadedAccounts);
  loading.value = false;
};

const loadChildUsers = async () => {
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("role", "child")
    .order("created_at");

  if (error) {
    status.value = error.message;
    return;
  }

  childUsers.value = data ?? [];
};

const loadLoginUsers = async () => {
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .order("created_at");

  if (error) {
    status.value = error.message;
    return;
  }

  const parents = (data ?? [])
    .filter((user) => user.role === "parent")
    .sort((left, right) => left.name.localeCompare(right.name));
  const children = (data ?? [])
    .filter((user) => user.role === "child")
    .sort((left, right) =>
      (left.created_at ?? "").localeCompare(right.created_at ?? ""),
    );

  const sorted = [...parents, ...children];

  loginUsers.value = sorted;
  if (!selectedLoginUserId.value && sorted.length > 0) {
    selectedLoginUserId.value = sorted[0].id;
  }
};

const restoreSession = async (userId: string) => {
  loading.value = true;
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    sessionStorage.removeItem("homebank.session");
    loading.value = false;
    return;
  }

  user.value = data;
  loading.value = false;
};

const handleLogin = async () => {
  status.value = null;
  sessionStatus.value = null;

  if (!isSupabaseConfigured) {
    status.value = "请先配置 Supabase 环境变量。";
    return;
  }

  if (!selectedLoginUserId.value) {
    status.value = "请选择登录用户。";
    return;
  }

  if (loginPin.value.length !== 4) {
    status.value = "请输入 4 位 PIN。";
    return;
  }

  loading.value = true;
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("id", selectedLoginUserId.value)
    .eq("pin", loginPin.value)
    .maybeSingle();

  if (error || !data) {
    status.value = "PIN 无效，请重试。";
    loading.value = false;
    return;
  }

  user.value = data;
  loginPin.value = "";

  const expiresAt = Date.now() + 1000 * 60 * 60 * 24 * 30;
  sessionStorage.setItem(
    "homebank.session",
    JSON.stringify({ userId: data.id, expiresAt }),
  );

  loading.value = false;
};

const handleLogout = () => {
  user.value = null;
  accounts.value = [];
  allTransactions.value = [];
  selectedAccountId.value = null;
  status.value = null;
  loginPin.value = "";
  selectedLoginUserId.value = null;
  selectedChildId.value = null;
  showChildManager.value = false;
  showAccountCreator.value = false;
  sessionStorage.removeItem("homebank.session");
};

const handleAddTransaction = async (type: "deposit" | "withdrawal") => {
  if (!selectedAccount.value || !user.value) return;

  const amount = Number.parseFloat(amountInput.value);
  if (Number.isNaN(amount) || amount <= 0) {
    status.value = "请输入有效金额。";
    return;
  }

  const trimmedNote = noteInput.value.trim();
  if (!trimmedNote) {
    status.value = "请输入备注。";
    return;
  }

  loading.value = true;
  const { data, error } = await supabase
    .from("transactions")
    .insert([
      {
        account_id: selectedAccount.value.id,
        type,
        amount,
        currency: selectedAccount.value.currency,
        note: trimmedNote,
        related_account_id: null,
        created_by: user.value.id,
      },
    ])
    .select();

  if (error) {
    status.value = error.message;
    loading.value = false;
    return;
  }

  allTransactions.value = [...allTransactions.value, ...(data ?? [])];
  amountInput.value = "";
  noteInput.value = "";
  status.value = "已保存交易。";
  if (statusTimeoutId) window.clearTimeout(statusTimeoutId);
  statusTimeoutId = window.setTimeout(() => {
    if (status.value === "已保存交易。") status.value = null;
  }, 1500);
  loading.value = false;
};

const handleCreateAccount = async () => {
  if (!user.value) return;

  const trimmedName = newAccountName.value.trim();
  const trimmedCurrency = newAccountCurrency.value.trim().toUpperCase();

  if (!trimmedName) {
    status.value = "请输入账户名称。";
    return;
  }

  if (!supportedCurrencies.includes(trimmedCurrency)) {
    status.value = "请选择有效币种。";
    return;
  }

  if (!newAccountOwnerId.value) {
    status.value = "请选择孩子账户归属。";
    return;
  }

  loading.value = true;
  const { error } = await supabase.from("accounts").insert([
    {
      name: trimmedName,
      currency: trimmedCurrency,
      owner_child_id: newAccountOwnerId.value,
      created_by: user.value.id,
      is_active: true,
    },
  ]);

  if (error) {
    status.value = error.message;
    loading.value = false;
    return;
  }

  newAccountName.value = "";
  status.value = "账户已创建。";
  await loadAccounts(user.value);
  loading.value = false;
};

const handleCreateChild = async () => {
  if (!user.value) return;

  const trimmedName = newChildName.value.trim();
  const trimmedPin = newChildPin.value.trim();

  if (!trimmedName) {
    status.value = "请输入孩子姓名。";
    return;
  }

  if (trimmedPin.length !== 4) {
    status.value = "请输入 4 位 PIN。";
    return;
  }

  if (!newChildAvatarId.value) {
    status.value = "请选择头像。";
    return;
  }

  loading.value = true;
  const { error } = await supabase.from("app_users").insert([
    {
      name: trimmedName,
      role: "child",
      pin: trimmedPin,
      avatar_id: newChildAvatarId.value,
    },
  ]);

  if (error) {
    status.value = error.message;
    loading.value = false;
    return;
  }

  newChildName.value = "";
  newChildPin.value = "";
  newChildAvatarId.value = childAvatars[0]?.id ?? "";
  status.value = "孩子用户已创建。";
  await loadChildUsers();
  await loadLoginUsers();
  loading.value = false;
};

const handleDeleteChild = async (childId: string) => {
  if (!user.value) return;

  loading.value = true;

  const { data: childAccounts, error: childAccountsError } = await supabase
    .from("accounts")
    .select("id")
    .eq("owner_child_id", childId);

  if (childAccountsError) {
    status.value = childAccountsError.message;
    loading.value = false;
    return;
  }

  const accountIds = (childAccounts ?? []).map((account) => account.id);

  if (accountIds.length > 0) {
    const { error: transactionsError } = await supabase
      .from("transactions")
      .delete()
      .in("account_id", accountIds);

    if (transactionsError) {
      status.value = transactionsError.message;
      loading.value = false;
      return;
    }

    const { error: accountsError } = await supabase
      .from("accounts")
      .delete()
      .in("id", accountIds);

    if (accountsError) {
      status.value = accountsError.message;
      loading.value = false;
      return;
    }
  }

  const { error: childError } = await supabase
    .from("app_users")
    .delete()
    .eq("id", childId);

  if (childError) {
    status.value = childError.message;
    loading.value = false;
    return;
  }

  await loadChildUsers();
  await loadAccounts(user.value);
  await loadLoginUsers();
  status.value = "已删除孩子及关联账户。";
  if (statusTimeoutId) window.clearTimeout(statusTimeoutId);
  statusTimeoutId = window.setTimeout(() => {
    if (status.value === "已删除孩子及关联账户。") status.value = null;
  }, 1500);
  loading.value = false;
};

const startEditChild = (child: AppUser) => {
  editingChildId.value = child.id;
  editingChildName.value = child.name;
};

const cancelEditChild = () => {
  editingChildId.value = null;
  editingChildName.value = "";
};

const handleUpdateChild = async () => {
  if (!user.value || !editingChildId.value) return;

  const trimmedName = editingChildName.value.trim();
  if (!trimmedName) {
    status.value = "请输入孩子姓名。";
    return;
  }

  loading.value = true;
  const { error } = await supabase
    .from("app_users")
    .update({ name: trimmedName })
    .eq("id", editingChildId.value);

  if (error) {
    status.value = error.message;
    loading.value = false;
    return;
  }

  await loadChildUsers();
  await loadLoginUsers();
  status.value = "已更新名称。";
  cancelEditChild();
  loading.value = false;
};

const startEditAccount = (account: Account) => {
  editingAccountId.value = account.id;
  editingAccountName.value = account.name;
};

const cancelEditAccount = () => {
  editingAccountId.value = null;
  editingAccountName.value = "";
};

const handleUpdateAccount = async () => {
  if (!user.value || !editingAccountId.value) return;

  const trimmedName = editingAccountName.value.trim();
  if (!trimmedName) {
    status.value = "请输入账户名称。";
    return;
  }

  loading.value = true;
  const { error } = await supabase
    .from("accounts")
    .update({ name: trimmedName })
    .eq("id", editingAccountId.value);

  if (error) {
    status.value = error.message;
    loading.value = false;
    return;
  }

  await loadAccounts(user.value);
  status.value = "账户名称已更新。";
  cancelEditAccount();
  loading.value = false;
};

const handleTransfer = async () => {
  if (!selectedAccount.value || !user.value) return;

  const amount = Number.parseFloat(transferAmount.value);
  if (Number.isNaN(amount) || amount <= 0) {
    status.value = "请输入有效转账金额。";
    return;
  }

  const balance = balances.value[selectedAccount.value.id] ?? 0;
  if (amount > balance) {
    status.value = "转出金额不能超过当前余额。";
    return;
  }

  const targetAccount = accounts.value.find(
    (account) => account.id === transferTargetId.value,
  );
  if (!targetAccount) {
    status.value = "请选择转入账户。";
    return;
  }

  if (targetAccount.currency !== selectedAccount.value.currency) {
    status.value = "只能在相同币种账户之间转账。";
    return;
  }

  const sourceOwnerName =
    childUsers.value.find(
      (child) => child.id === selectedAccount.value?.owner_child_id,
    )?.name ?? selectedAccount.value.name;
  const targetOwnerName =
    childUsers.value.find((child) => child.id === targetAccount.owner_child_id)
      ?.name ?? targetAccount.name;

  loading.value = true;
  const payload = [
    {
      account_id: selectedAccount.value.id,
      type: "transfer_out" as const,
      amount,
      currency: selectedAccount.value.currency,
      note: `转出至 ${targetOwnerName} ${targetAccount.name}`,
      related_account_id: targetAccount.id,
      created_by: user.value.id,
    },
    {
      account_id: targetAccount.id,
      type: "transfer_in" as const,
      amount,
      currency: targetAccount.currency,
      note: `来自 ${sourceOwnerName} ${selectedAccount.value.name}`,
      related_account_id: selectedAccount.value.id,
      created_by: user.value.id,
    },
  ];

  const { data, error } = await supabase
    .from("transactions")
    .insert(payload)
    .select();

  if (error) {
    status.value = error.message;
    loading.value = false;
    return;
  }

  allTransactions.value = [...allTransactions.value, ...(data ?? [])];
  transferAmount.value = "";
  transferTargetId.value = "";
  status.value = "转账完成。";
  loading.value = false;
};

const getTransactionNote = (transaction: Transaction) => {
  if (transaction.related_account_id) {
    const relatedAccount = accounts.value.find(
      (account) => account.id === transaction.related_account_id,
    );

    if (relatedAccount) {
      const ownerName =
        childUsers.value.find(
          (child) => child.id === relatedAccount.owner_child_id,
        )?.name ?? relatedAccount.name;

      if (transaction.type === "transfer_out") {
        return `转出至 ${ownerName} ${relatedAccount.name}`;
      }

      if (transaction.type === "transfer_in") {
        return `来自 ${ownerName} ${relatedAccount.name}`;
      }
    }
  }

  return transaction.note || "—";
};

watch([accounts, allTransactions], () => {
  if (
    editingAccountId.value &&
    editingAccountId.value !== selectedAccountId.value
  ) {
    cancelEditAccount();
  }
});

watch(selectedAccountId, () => {
  visibleTransactions.value = 10;
});

watch([childUsers, selectedChildId], () => {
  if (user.value?.role !== "parent") return;

  if (childUsers.value.length === 0) {
    selectedChildId.value = null;
    newAccountOwnerId.value = "";
    return;
  }

  if (
    !selectedChildId.value ||
    !childUsers.value.some((child) => child.id === selectedChildId.value)
  ) {
    selectedChildId.value = childUsers.value[0]?.id ?? null;
  }
});

watch([accounts, selectedAccountId, selectedChildId, user], () => {
  if (user.value?.role !== "parent") return;
  if (!selectedChildId.value) {
    selectedAccountId.value = null;
    return;
  }

  const childAccounts = accounts.value.filter(
    (account) => account.owner_child_id === selectedChildId.value,
  );
  if (childAccounts.length === 0) {
    selectedAccountId.value = null;
    return;
  }

  if (
    !selectedAccountId.value ||
    !childAccounts.some((account) => account.id === selectedAccountId.value)
  ) {
    selectedAccountId.value = childAccounts[0]?.id ?? null;
  }
});

watch([accounts, selectedAccountId, user], () => {
  if (
    !selectedAccountId.value &&
    accounts.value.length > 0 &&
    user.value?.role !== "parent"
  ) {
    selectedAccountId.value = accounts.value[0]?.id ?? null;
  }
});

watch([childUsers, newAccountOwnerId], () => {
  if (!newAccountOwnerId.value && childUsers.value.length > 0) {
    newAccountOwnerId.value = childUsers.value[0]?.id ?? "";
  }
});

watch(selectedChildId, () => {
  if (selectedChildId.value) {
    newAccountOwnerId.value = selectedChildId.value;
  }
});

onMounted(async () => {
  if (!isSupabaseConfigured || user.value) return;

  await loadLoginUsers();

  const sessionRaw = sessionStorage.getItem("homebank.session");
  if (!sessionRaw) return;

  try {
    const session = JSON.parse(sessionRaw) as {
      userId?: string;
      expiresAt?: number;
    };
    if (!session.userId || !session.expiresAt) {
      sessionStorage.removeItem("homebank.session");
      return;
    }

    if (Date.now() > session.expiresAt) {
      sessionStorage.removeItem("homebank.session");
      sessionStatus.value = "登录已过期，请重新登录。";
      return;
    }

    await restoreSession(session.userId);
  } catch {
    sessionStorage.removeItem("homebank.session");
  }
});

watch(user, async (currentUser) => {
  if (!currentUser) return;
  await loadAccounts(currentUser);
  if (currentUser.role === "parent") {
    await loadChildUsers();
  }
});
</script>
