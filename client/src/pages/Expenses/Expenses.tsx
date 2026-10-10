import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tab,
  Tabs,
  Fab,
  InputAdornment,
  Alert,
  Tooltip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Add,
  Delete,
  Search,
  Restaurant,
  DirectionsCar,
  ShoppingBag,
  Movie,
  ElectricBolt,
  LocalHospital,
  School,
  Category,
  TrendingDown,
  CalendarMonth,
  Savings,
  FilterList,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  StatCardsSkeleton,
  ListSkeleton,
  ChartSkeleton,
  CardGridSkeleton,
} from '../../components/Skeletons/Skeletons';

// ─── Types ────────────────────────────────────────────────────────────────────

type Category =
  | 'Food'
  | 'Transport'
  | 'Shopping'
  | 'Entertainment'
  | 'Utilities'
  | 'Health'
  | 'Education'
  | 'Other';

type PaymentMethod = 'Cash' | 'Card' | 'UPI' | 'Net Banking';

interface Expense {
  _id: string;
  amount: number;
  category: Category;
  description: string;
  date: string;
  paymentMethod: PaymentMethod;
  tags: string[];
}

interface ExpenseSummary {
  todaySpending: number;
  monthSpending: number;
  topCategory: string;
  savingsRate: number;
}

interface DailySpend {
  date: string;
  amount: number;
}

interface CategoryBreakdown {
  category: string;
  amount: number;
  color: string;
}

interface BudgetItem {
  category: Category;
  budget: number;
  spent: number;
}

interface NewExpenseForm {
  amount: string;
  category: Category;
  description: string;
  date: string;
  paymentMethod: PaymentMethod;
  tags: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<Category, string> = {
  Food: '#FF6B35',
  Transport: '#4CAF50',
  Shopping: '#9C27B0',
  Entertainment: '#FF9800',
  Utilities: '#2196F3',
  Health: '#F44336',
  Education: '#00BCD4',
  Other: '#607D8B',
};

const CATEGORY_ICONS: Record<Category, React.ReactNode> = {
  Food: <Restaurant fontSize="small" />,
  Transport: <DirectionsCar fontSize="small" />,
  Shopping: <ShoppingBag fontSize="small" />,
  Entertainment: <Movie fontSize="small" />,
  Utilities: <ElectricBolt fontSize="small" />,
  Health: <LocalHospital fontSize="small" />,
  Education: <School fontSize="small" />,
  Other: <Category fontSize="small" />,
};

const CATEGORIES: Category[] = [
  'Food', 'Transport', 'Shopping', 'Entertainment',
  'Utilities', 'Health', 'Education', 'Other',
];

const PAYMENT_METHODS: PaymentMethod[] = ['Cash', 'Card', 'UPI', 'Net Banking'];

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: 'var(--fh-paper-solid)',
  border: '1px solid rgba(148,163,184,0.2)',
  borderRadius: 8,
  color: 'var(--fh-text)',
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

// ─── API helpers ──────────────────────────────────────────────────────────────

const fetchExpenses = async (params: Record<string, string>) => {
  const { data } = await axios.get('/api/expenses', { params });
  return data;
};

const fetchSummary = async (): Promise<ExpenseSummary> => {
  const { data } = await axios.get('/api/expenses/summary');
  return data;
};

const fetchAnalytics = async () => {
  const { data } = await axios.get('/api/expenses/analytics');
  return data;
};

const fetchBudgets = async (): Promise<BudgetItem[]> => {
  const { data } = await axios.get('/api/expenses/budgets');
  return data;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface TabPanelProps {
  children?: React.ReactNode;
  value: number;
  index: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <Box role="tabpanel" hidden={value !== index} sx={{ pt: { xs: 1, md: 2 } }}>
    {value === index && children}
  </Box>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const Expenses: React.FC = () => {
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // UI state
  const [activeTab, setActiveTab] = useState(0);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [form, setForm] = useState<NewExpenseForm>({
    amount: '',
    category: 'Food',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: 'UPI',
    tags: '',
  });

  // ── Queries ──────────────────────────────────────────────────────────────────

  const summaryQuery = useQuery<ExpenseSummary>('expense-summary', fetchSummary, {
    onError: () => { toast.error('Failed to load expense summary'); },
  });

  const expenseParams: Record<string, string> = {};
  if (searchText) expenseParams.search = searchText;
  if (filterCategory !== 'All') expenseParams.category = filterCategory;
  if (filterDateFrom) expenseParams.dateFrom = filterDateFrom;
  if (filterDateTo) expenseParams.dateTo = filterDateTo;

  const expensesQuery = useQuery(
    ['expenses', expenseParams],
    () => fetchExpenses(expenseParams),
    { onError: () => { toast.error('Failed to load expenses'); } }
  );

  const analyticsQuery = useQuery('expense-analytics', fetchAnalytics, {
    enabled: activeTab === 1,
    onError: () => { toast.error('Failed to load analytics'); },
  });

  const budgetsQuery = useQuery<BudgetItem[]>('expense-budgets', fetchBudgets, {
    enabled: activeTab === 2,
    onError: () => { toast.error('Failed to load budgets'); },
  });

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const addExpenseMutation = useMutation(
    (payload: Omit<Expense, '_id'>) => axios.post('/api/expenses', payload),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('expenses');
        queryClient.invalidateQueries('expense-summary');
        queryClient.invalidateQueries('expense-analytics');
        toast.success('Expense added');
        setOpenAddDialog(false);
        setForm({
          amount: '',
          category: 'Food',
          description: '',
          date: new Date().toISOString().slice(0, 10),
          paymentMethod: 'UPI',
          tags: '',
        });
      },
      onError: () => { toast.error('Failed to add expense'); },
    }
  );

  const deleteExpenseMutation = useMutation(
    (id: string) => axios.delete(`/api/expenses/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('expenses');
        queryClient.invalidateQueries('expense-summary');
        toast.success('Expense deleted');
      },
      onError: () => { toast.error('Failed to delete expense'); },
    }
  );

  const saveBudgetMutation = useMutation(
    (payload: { category: Category; budget: number }) =>
      axios.put(`/api/expenses/budgets/${payload.category}`, { budget: payload.budget }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('expense-budgets');
        toast.success('Budget updated');
      },
      onError: () => { toast.error('Failed to update budget'); },
    }
  );

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleAddExpense = () => {
    if (!form.amount || isNaN(Number(form.amount))) {
      toast.error('Please enter a valid amount');
      return;
    }
    addExpenseMutation.mutate({
      amount: Number(form.amount),
      category: form.category,
      description: form.description,
      date: form.date,
      paymentMethod: form.paymentMethod,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    });
  };

  // ── Derived data ──────────────────────────────────────────────────────────────

  const expenses: Expense[] = expensesQuery.data?.expenses ?? [];
  const summary = summaryQuery.data;

  const dailyData: DailySpend[] = analyticsQuery.data?.dailySpend ?? [];
  const categoryData: CategoryBreakdown[] = analyticsQuery.data?.categoryBreakdown ?? [];
  const budgets: BudgetItem[] = budgetsQuery.data ?? [];

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ position: 'relative', pb: 10 }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexWrap: 'wrap',
          gap: 2,
          mb: 3,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--fh-text)', fontSize: { xs: '1.6rem', md: '2.125rem' } }}>
            Expense Tracker
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--fh-muted)', mt: 0.5 }}>
            Track daily spending, analyse categories and stay on budget
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpenAddDialog(true)}>
          Add Expense
        </Button>
      </Box>

      {/* Summary Cards */}
      {summaryQuery.isLoading ? (
        <StatCardsSkeleton count={4} />
      ) : (
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 2, md: 3 } }}>
        {/* Today */}
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ borderLeft: '4px solid var(--fh-down)' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <TrendingDown sx={{ color: 'var(--fh-down)' }} />
                <Typography variant="body2" color="text.secondary">
                  Today's Spending
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={700}>
                {formatCurrency(summary?.todaySpending ?? 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* This Month */}
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ borderLeft: '4px solid var(--fh-warn)' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <CalendarMonth sx={{ color: 'var(--fh-warn)' }} />
                <Typography variant="body2" color="text.secondary">
                  This Month
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={700}>
                {formatCurrency(summary?.monthSpending ?? 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Category */}
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ borderLeft: '4px solid #a855f7' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Category sx={{ color: '#a855f7' }} />
                <Typography variant="body2" color="text.secondary">
                  Top Category
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={700}>
                {summary?.topCategory ?? '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Savings Rate */}
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ borderLeft: '4px solid var(--fh-up)' }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <Savings sx={{ color: 'var(--fh-up)' }} />
                <Typography variant="body2" color="text.secondary">
                  Savings Rate
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight={700} color="success.main">
                {(summary?.savingsRate ?? 0).toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      )}

      {/* Tabs */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{ borderBottom: 1, borderColor: 'divider', px: { xs: 0, sm: 2 } }}
          >
            <Tab label="All Expenses" />
            <Tab label="Analytics" />
            <Tab label="Budget" />
          </Tabs>

          <Box sx={{ p: { xs: 2, md: 3 } }}>
            {/* ── Tab 0: All Expenses ─────────────────────────────────────────── */}
            <TabPanel value={activeTab} index={0}>
              {/* Filter Bar */}
              <Grid container spacing={2} mb={3} alignItems="center">
                <Grid item xs={12} sm={6} md={3}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Search"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Category</InputLabel>
                    <Select
                      label="Category"
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                    >
                      <MenuItem value="All">All</MenuItem>
                      {CATEGORIES.map((c) => (
                        <MenuItem key={c} value={c}>{c}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="From"
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="To"
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                  <Button
                    startIcon={<FilterList />}
                    onClick={() => {
                      setSearchText('');
                      setFilterCategory('All');
                      setFilterDateFrom('');
                      setFilterDateTo('');
                    }}
                    variant="outlined"
                    size="small"
                  >
                    Clear Filters
                  </Button>
                </Grid>
              </Grid>

              {/* Expense List */}
              {expensesQuery.isLoading ? (
                <ListSkeleton rows={5} title={false} avatar />
              ) : expensesQuery.isError ? (
                <Alert severity="error">Failed to load expenses. Please try again.</Alert>
              ) : expenses.length === 0 ? (
                <Box textAlign="center" py={6}>
                  <Typography color="text.secondary">No expenses found.</Typography>
                </Box>
              ) : (
                <Box display="flex" flexDirection="column" gap={2}>
                  {expenses.map((expense) => (
                    <Card
                      key={expense._id}
                      variant="outlined"
                      sx={{
                        '&:hover': { borderColor: 'rgba(99,102,241,0.4)' },
                        transition: 'border-color 0.2s',
                      }}
                    >
                      <CardContent sx={{ py: '12px !important', px: { xs: 1.5, sm: 2 } }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" gap={1}>
                          <Box display="flex" alignItems="center" gap={{ xs: 1.5, sm: 2 }} sx={{ minWidth: 0, flex: 1 }}>
                            <Box
                              sx={{
                                width: 40,
                                height: 40,
                                borderRadius: '50%',
                                backgroundColor: `color-mix(in srgb, ${CATEGORY_COLORS[expense.category]} 13%, transparent)`,
                                color: CATEGORY_COLORS[expense.category],
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              {CATEGORY_ICONS[expense.category]}
                            </Box>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography variant="body1" fontWeight={600} noWrap>
                                {expense.description || expense.category}
                              </Typography>
                              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                <Typography variant="body2" color="text.secondary">
                                  {new Date(expense.date).toLocaleDateString('en-IN')}
                                </Typography>
                                <Chip
                                  label={expense.paymentMethod}
                                  size="small"
                                  variant="outlined"
                                  sx={{ height: 18, fontSize: '0.65rem' }}
                                />
                                <Chip
                                  label={expense.category}
                                  size="small"
                                  sx={{
                                    height: 18,
                                    fontSize: '0.65rem',
                                    backgroundColor: `color-mix(in srgb, ${CATEGORY_COLORS[expense.category]} 19%, transparent)`,
                                    color: CATEGORY_COLORS[expense.category],
                                  }}
                                />
                              </Box>
                            </Box>
                          </Box>
                          <Box display="flex" alignItems="center" gap={{ xs: 0.5, sm: 1 }} sx={{ flexShrink: 0 }}>
                            <Typography
                              variant="h6"
                              fontWeight={700}
                              color="error.main"
                              sx={{ fontSize: { xs: '0.95rem', sm: '1.25rem' }, whiteSpace: 'nowrap' }}
                            >
                              -{formatCurrency(expense.amount)}
                            </Typography>
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => deleteExpenseMutation.mutate(expense._id)}
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                        {expense.tags.length > 0 && (
                          <Box display="flex" gap={0.5} mt={1} flexWrap="wrap">
                            {expense.tags.map((tag) => (
                              <Chip key={tag} label={`#${tag}`} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />
                            ))}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              )}
            </TabPanel>

            {/* ── Tab 1: Analytics ────────────────────────────────────────────── */}
            <TabPanel value={activeTab} index={1}>
              {analyticsQuery.isLoading ? (
                <Grid container spacing={{ xs: 2, md: 3 }}>
                  <Grid item xs={12} md={7}><ChartSkeleton height={280} /></Grid>
                  <Grid item xs={12} md={5}><ChartSkeleton height={280} /></Grid>
                </Grid>
              ) : analyticsQuery.isError ? (
                <Alert severity="error">Failed to load analytics.</Alert>
              ) : (
                <>
                  <Grid container spacing={{ xs: 2, md: 3 }} mb={3}>
                    {/* Daily Bar Chart */}
                    <Grid item xs={12} md={7} sx={{ minWidth: 0 }}>
                      <Typography variant="h6" fontWeight={600} mb={2} sx={{ color: 'var(--fh-text)' }}>
                        Daily Spending — Last 30 Days
                      </Typography>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={dailyData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
                          <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--fh-text-3)' }} stroke="rgba(148,163,184,0.3)" />
                          <YAxis tick={{ fontSize: 11, fill: 'var(--fh-text-3)' }} stroke="rgba(148,163,184,0.3)" width={isMobile ? 40 : 60} />
                          <RechartsTooltip
                            formatter={(v: number) => formatCurrency(v)}
                            contentStyle={TOOLTIP_STYLE}
                            cursor={{ fill: 'rgba(99,102,241,0.08)' }}
                          />
                          <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Grid>

                    {/* Category Pie Chart */}
                    <Grid item xs={12} md={5} sx={{ minWidth: 0 }}>
                      <Typography variant="h6" fontWeight={600} mb={2} sx={{ color: 'var(--fh-text)' }}>
                        Category Breakdown
                      </Typography>
                      <ResponsiveContainer width="100%" height={280}>
                        <PieChart>
                          <Pie
                            data={categoryData}
                            dataKey="amount"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            outerRadius={isMobile ? 70 : 90}
                            stroke="var(--fh-paper-solid)"
                            label={
                              isMobile
                                ? false
                                : ({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`
                            }
                            labelLine={false}
                          >
                            {categoryData.map((entry, index) => (
                              <Cell
                                key={index}
                                fill={CATEGORY_COLORS[entry.category as Category] ?? '#607D8B'}
                              />
                            ))}
                          </Pie>
                          <Legend wrapperStyle={{ color: 'var(--fh-text-3)', fontSize: 12 }} />
                          <RechartsTooltip formatter={(v: number) => formatCurrency(v)} contentStyle={TOOLTIP_STYLE} />
                        </PieChart>
                      </ResponsiveContainer>
                    </Grid>
                  </Grid>

                  {/* Stat Cards */}
                  <Grid container spacing={{ xs: 2, md: 3 }}>
                    {[
                      {
                        label: 'Avg Daily Spend',
                        value: formatCurrency(analyticsQuery.data?.avgDailySpend ?? 0),
                      },
                      {
                        label: 'Highest Spending Day',
                        value: analyticsQuery.data?.highestDay ?? '—',
                      },
                      {
                        label: 'Lowest Category',
                        value: analyticsQuery.data?.lowestCategory ?? '—',
                      },
                    ].map((stat) => (
                      <Grid item xs={12} sm={4} key={stat.label}>
                        <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                          <Typography variant="body2" color="text.secondary">{stat.label}</Typography>
                          <Typography variant="h6" fontWeight={700} mt={0.5} noWrap>{stat.value}</Typography>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </>
              )}
            </TabPanel>

            {/* ── Tab 2: Budget ───────────────────────────────────────────────── */}
            <TabPanel value={activeTab} index={2}>
              {budgetsQuery.isLoading ? (
                <CardGridSkeleton count={6} height={170} />
              ) : budgetsQuery.isError ? (
                <Alert severity="error">Failed to load budgets.</Alert>
              ) : (
                <Grid container spacing={{ xs: 2, md: 3 }}>
                  {CATEGORIES.map((cat) => {
                    const item = budgets.find((b) => b.category === cat);
                    const budget = item?.budget ?? 0;
                    const spent = item?.spent ?? 0;
                    const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
                    const over = budget > 0 && spent > budget;

                    return (
                      <Grid item xs={12} sm={6} lg={4} xl={3} key={cat}>
                        <Card variant="outlined" sx={{ borderColor: over ? 'error.main' : 'divider' }}>
                          <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Box sx={{ color: CATEGORY_COLORS[cat] }}>
                                  {CATEGORY_ICONS[cat]}
                                </Box>
                                <Typography variant="body1" fontWeight={600}>
                                  {cat}
                                </Typography>
                              </Box>
                              {over && (
                                <Chip label="Over Budget" size="small" color="error" />
                              )}
                            </Box>
                            <Box display="flex" justifyContent="space-between" flexWrap="wrap" columnGap={2} mb={1}>
                              <Typography variant="body2" color="text.secondary">
                                Spent: <strong>{formatCurrency(spent)}</strong>
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Budget: <strong>{formatCurrency(budget)}</strong>
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={pct}
                              color={pct >= 100 ? 'error' : pct >= 75 ? 'warning' : 'success'}
                              sx={{ height: 8, borderRadius: 4 }}
                            />
                            <Box display="flex" gap={1} mt={2}>
                              <TextField
                                size="small"
                                label="Set Budget (₹)"
                                type="number"
                                defaultValue={budget || ''}
                                onBlur={(e) => {
                                  const val = Number(e.target.value);
                                  if (val > 0) {
                                    saveBudgetMutation.mutate({ category: cat, budget: val });
                                  }
                                }}
                                sx={{ flex: 1 }}
                              />
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    );
                  })}
                </Grid>
              )}
            </TabPanel>
          </Box>
        </CardContent>
      </Card>

      {/* FAB */}
      {activeTab === 0 && (
        <Fab
          color="primary"
          aria-label="Add expense"
          sx={{ position: 'fixed', bottom: { xs: 16, md: 32 }, right: { xs: 16, md: 32 } }}
          onClick={() => setOpenAddDialog(true)}
        >
          <Add />
        </Fab>
      )}

      {/* Add Expense Dialog */}
      <Dialog
        open={openAddDialog}
        onClose={() => setOpenAddDialog(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Add Expense</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Amount (₹)"
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  label="Category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
                >
                  {CATEGORIES.map((c) => (
                    <MenuItem key={c} value={c}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box sx={{ color: CATEGORY_COLORS[c] }}>{CATEGORY_ICONS[c]}</Box>
                        {c}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  label="Payment Method"
                  value={form.paymentMethod}
                  onChange={(e) => setForm({ ...form, paymentMethod: e.target.value as PaymentMethod })}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <MenuItem key={m} value={m}>{m}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tags (comma-separated)"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="e.g. groceries, weekend, essential"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddExpense}
            disabled={addExpenseMutation.isLoading}
          >
            {addExpenseMutation.isLoading ? 'Adding...' : 'Add Expense'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Expenses;
