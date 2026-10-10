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
  Alert,
  Drawer,
  Divider,
  Tooltip,
  InputAdornment,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  CreditCard,
  Refresh,
  Warning,
  ArrowForward,
  Close,
  TrendingUp,
  TrendingDown,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  StatCardsSkeleton,
  CardGridSkeleton,
  ListSkeleton,
} from '../../components/Skeletons/Skeletons';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreditCardData {
  _id: string;
  bankName: string;
  cardName: string;
  last4Digits: string;
  cardType: string;
  creditLimit: number;
  availableCredit: number;
  currentBalance: number;
  billingCycleDate: number;
  dueDate: string;
  color: string;
}

interface Transaction {
  _id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  type: 'debit' | 'credit';
  merchantName?: string;
}

interface CardFormData {
  bankName: string;
  cardName: string;
  last4Digits: string;
  cardType: string;
  creditLimit: string;
  billingCycleDate: string;
  dueDate: string;
  color: string;
}

interface TxFormData {
  amount: string;
  description: string;
  category: string;
  type: 'debit' | 'credit';
  merchantName: string;
  date: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CARD_TYPES = ['Visa', 'Mastercard', 'RuPay', 'Amex', 'Discover'];

const PRESET_COLORS = [
  '#1a237e', '#283593', '#1565c0', '#0277bd',
  '#00695c', '#2e7d32', '#558b2f', '#e65100',
  '#bf360c', '#4a148c', '#880e4f', '#263238',
];

const TX_CATEGORIES = [
  'Food', 'Transport', 'Shopping', 'Entertainment',
  'Utilities', 'Health', 'Education', 'Travel', 'Other',
];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

const daysUntil = (dateStr: string) => {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// ─── API helpers ──────────────────────────────────────────────────────────────

const fetchCards = async (): Promise<CreditCardData[]> => {
  const { data } = await axios.get('/api/creditcards');
  return data.creditCards ?? data.cards ?? [];
};

const fetchTransactions = async (cardId: string): Promise<Transaction[]> => {
  const { data } = await axios.get(`/api/creditcards/${cardId}/transactions`);
  return data.transactions ?? data;
};

// ─── Visual Credit Card ───────────────────────────────────────────────────────

interface CreditCardVisualProps {
  card: CreditCardData;
  onViewTx: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const CreditCardVisual: React.FC<CreditCardVisualProps> = ({ card, onViewTx, onEdit, onDelete }) => {
  const utilization = card.creditLimit > 0
    ? ((card.currentBalance / card.creditLimit) * 100)
    : 0;

  const dueDays = daysUntil(card.dueDate);
  const dueSoon = dueDays <= 5;

  const utilizationColor = utilization >= 75 ? 'var(--fh-down)' : utilization >= 40 ? 'var(--fh-warn)' : 'var(--fh-up)';

  return (
    <Card
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s',
        '&:hover': { transform: 'translateY(-4px)' },
      }}
    >
      {/* Card Face */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}cc 100%)`,
          p: { xs: 2, sm: 3 },
          color: 'white',
          position: 'relative',
          minHeight: 160,
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={700} noWrap sx={{ textShadow: '0 1px 3px var(--fh-shadow)' }}>
              {card.bankName}
            </Typography>
            <Typography variant="body2" noWrap sx={{ opacity: 0.85 }}>
              {card.cardName}
            </Typography>
          </Box>
          <Box display="flex" gap={0.5} sx={{ flexShrink: 0 }}>
            <Tooltip title="Edit card">
              <IconButton size="small" sx={{ color: 'white', opacity: 0.8 }} onClick={onEdit}>
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete card">
              <IconButton size="small" sx={{ color: 'white', opacity: 0.8 }} onClick={onDelete}>
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Typography
          variant="h5"
          fontWeight={600}
          noWrap
          sx={{
            mt: 3,
            letterSpacing: { xs: 2, sm: 4 },
            fontSize: { xs: '1.1rem', sm: '1.4rem' },
            fontFamily: 'monospace',
          }}
        >
          **** **** **** {card.last4Digits}
        </Typography>

        <Box display="flex" justifyContent="space-between" alignItems="flex-end" mt={2}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" sx={{ opacity: 0.7 }}>LIMIT</Typography>
            <Typography variant="body2" fontWeight={600}>
              {formatCurrency(card.creditLimit)}
            </Typography>
          </Box>
          <Box textAlign="right">
            <Typography variant="caption" sx={{ opacity: 0.7 }}>TYPE</Typography>
            <Typography variant="body2" fontWeight={600}>{card.cardType}</Typography>
          </Box>
        </Box>

        {dueSoon && (
          <Chip
            icon={<Warning sx={{ fontSize: '14px !important' }} />}
            label={`Due in ${dueDays}d`}
            size="small"
            sx={{
              mt: 1.5,
              backgroundColor: 'var(--fh-down)',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.65rem',
            }}
          />
        )}
      </Box>

      {/* Card Details */}
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Grid container spacing={1} mb={1.5}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">Current Balance</Typography>
            <Typography variant="body1" fontWeight={700} color="error.main">
              {formatCurrency(card.currentBalance)}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">Available</Typography>
            <Typography variant="body1" fontWeight={700} color="success.main">
              {formatCurrency(card.availableCredit)}
            </Typography>
          </Grid>
        </Grid>

        <Box mb={1}>
          <Box display="flex" justifyContent="space-between" flexWrap="wrap" columnGap={1}>
            <Typography variant="caption" color="text.secondary">
              Utilization {utilization.toFixed(1)}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Due: {new Date(card.dueDate).toLocaleDateString('en-IN')}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(utilization, 100)}
            sx={{
              height: 6,
              borderRadius: 3,
              mt: 0.5,
              backgroundColor: 'rgba(148,163,184,0.15)',
              '& .MuiLinearProgress-bar': { backgroundColor: utilizationColor },
            }}
          />
        </Box>

        <Button
          fullWidth
          variant="outlined"
          size="small"
          endIcon={<ArrowForward />}
          onClick={onViewTx}
          sx={{ mt: 'auto' }}
        >
          View Transactions
        </Button>
      </CardContent>
    </Card>
  );
};

// ─── Transactions Drawer ──────────────────────────────────────────────────────

interface TxDrawerProps {
  card: CreditCardData | null;
  open: boolean;
  onClose: () => void;
}

const TxDrawer: React.FC<TxDrawerProps> = ({ card, open, onClose }) => {
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [openTxDialog, setOpenTxDialog] = useState(false);
  const [txForm, setTxForm] = useState<TxFormData>({
    amount: '',
    description: '',
    category: 'Other',
    type: 'debit',
    merchantName: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const txQuery = useQuery(
    ['card-transactions', card?._id],
    () => fetchTransactions(card!._id),
    {
      enabled: !!card && open,
      onError: () => { toast.error('Failed to load transactions'); },
    }
  );

  const addTxMutation = useMutation(
    (payload: Omit<TxFormData, 'amount'> & { amount: number }) =>
      axios.post(`/api/creditcards/${card!._id}/transactions`, payload),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['card-transactions', card?._id]);
        queryClient.invalidateQueries('credit-cards');
        toast.success('Transaction added');
        setOpenTxDialog(false);
        setTxForm({
          amount: '',
          description: '',
          category: 'Other',
          type: 'debit',
          merchantName: '',
          date: new Date().toISOString().slice(0, 10),
        });
      },
      onError: () => { toast.error('Failed to add transaction'); },
    }
  );

  const transactions: Transaction[] = txQuery.data ?? [];

  const thisMonthTotal = transactions
    .filter((t) => {
      const d = new Date(t.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && t.type === 'debit';
    })
    .reduce((s, t) => s + t.amount, 0);

  const handleAddTx = () => {
    if (!txForm.amount || isNaN(Number(txForm.amount))) {
      toast.error('Enter a valid amount');
      return;
    }
    addTxMutation.mutate({ ...txForm, amount: Number(txForm.amount) });
  };

  return (
    <>
      <Drawer
        anchor="right"
        open={open}
        onClose={onClose}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}
      >
        <Box sx={{ p: { xs: 2, sm: 3 }, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" gap={1} mb={2}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" fontWeight={700} noWrap sx={{ color: 'var(--fh-text)' }}>
                {card?.bankName} — {card?.cardName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                **** {card?.last4Digits}
              </Typography>
            </Box>
            <IconButton onClick={onClose} aria-label="Close" sx={{ flexShrink: 0 }}><Close /></IconButton>
          </Box>

          {/* Month Total */}
          <Card
            sx={{
              mb: 2,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.22) 0%, rgba(6,182,212,0.12) 100%)',
              border: '1px solid rgba(99,102,241,0.35)',
            }}
          >
            <CardContent sx={{ py: '12px !important' }}>
              <Typography variant="body2" sx={{ color: 'var(--fh-text-3)' }}>This Month's Spend</Typography>
              <Typography variant="h5" fontWeight={700} sx={{ color: 'var(--fh-text)' }}>
                {formatCurrency(thisMonthTotal)}
              </Typography>
            </CardContent>
          </Card>

          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="subtitle1" fontWeight={600}>Transactions</Typography>
            <Button size="small" startIcon={<Add />} onClick={() => setOpenTxDialog(true)}>
              Add
            </Button>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Box sx={{ flex: 1, overflowY: 'auto' }}>
            {txQuery.isLoading ? (
              <ListSkeleton rows={6} title={false} avatar />
            ) : transactions.length === 0 ? (
              <Box textAlign="center" py={4}>
                <CreditCard sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">No transactions yet</Typography>
              </Box>
            ) : (
              transactions.map((tx) => (
                <Box
                  key={tx._id}
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  gap={1}
                  py={1.5}
                  borderBottom="1px solid"
                  borderColor="divider"
                >
                  <Box display="flex" alignItems="center" gap={1.5} sx={{ minWidth: 0 }}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        backgroundColor: tx.type === 'debit' ? 'rgba(244,63,94,0.12)' : 'rgba(16,185,129,0.12)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {tx.type === 'debit'
                        ? <TrendingDown sx={{ color: 'var(--fh-down)', fontSize: 18 }} />
                        : <TrendingUp sx={{ color: 'var(--fh-up)', fontSize: 18 }} />}
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {tx.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap component="div">
                        {tx.merchantName ? `${tx.merchantName} · ` : ''}{tx.category} · {new Date(tx.date).toLocaleDateString('en-IN')}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    color={tx.type === 'debit' ? 'error.main' : 'success.main'}
                    sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
                  >
                    {tx.type === 'debit' ? '-' : '+'}{formatCurrency(tx.amount)}
                  </Typography>
                </Box>
              ))
            )}
          </Box>
        </Box>
      </Drawer>

      {/* Add Transaction Dialog */}
      <Dialog
        open={openTxDialog}
        onClose={() => setOpenTxDialog(false)}
        maxWidth="xs"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Add Transaction</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Amount (₹)"
                type="number"
                value={txForm.amount}
                onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={txForm.description}
                onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  label="Category"
                  value={txForm.category}
                  onChange={(e) => setTxForm({ ...txForm, category: e.target.value })}
                >
                  {TX_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  label="Type"
                  value={txForm.type}
                  onChange={(e) => setTxForm({ ...txForm, type: e.target.value as 'debit' | 'credit' })}
                >
                  <MenuItem value="debit">Debit</MenuItem>
                  <MenuItem value="credit">Credit</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Merchant Name"
                value={txForm.merchantName}
                onChange={(e) => setTxForm({ ...txForm, merchantName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Date"
                type="date"
                value={txForm.date}
                onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTxDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddTx} disabled={addTxMutation.isLoading}>
            {addTxMutation.isLoading ? 'Adding...' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const CreditCards: React.FC = () => {
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [editCard, setEditCard] = useState<CreditCardData | null>(null);
  const [viewTxCard, setViewTxCard] = useState<CreditCardData | null>(null);

  const defaultForm: CardFormData = {
    bankName: '',
    cardName: '',
    last4Digits: '',
    cardType: 'Visa',
    creditLimit: '',
    billingCycleDate: '1',
    dueDate: '',
    color: PRESET_COLORS[0],
  };

  const [form, setForm] = useState<CardFormData>(defaultForm);

  // ── Queries ──────────────────────────────────────────────────────────────────

  const cardsQuery = useQuery<CreditCardData[]>('credit-cards', fetchCards, {
    onError: () => { toast.error('Failed to load credit cards'); },
  });

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const addCardMutation = useMutation(
    (payload: Omit<CardFormData, 'creditLimit' | 'billingCycleDate'> & {
      creditLimit: number;
      billingCycleDate: number;
    }) => axios.post('/api/creditcards', payload),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('credit-cards');
        toast.success('Card added successfully');
        setOpenAddDialog(false);
        setForm(defaultForm);
      },
      onError: () => { toast.error('Failed to add card'); },
    }
  );

  const updateCardMutation = useMutation(
    ({ id, ...payload }: CardFormData & { id: string }) =>
      axios.put(`/api/creditcards/${id}`, {
        ...payload,
        creditLimit: Number(payload.creditLimit),
        billingCycleDate: Number(payload.billingCycleDate),
      }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('credit-cards');
        toast.success('Card updated');
        setEditCard(null);
      },
      onError: () => { toast.error('Failed to update card'); },
    }
  );

  const deleteCardMutation = useMutation(
    (id: string) => axios.delete(`/api/creditcards/${id}`),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('credit-cards');
        toast.success('Card deleted');
      },
      onError: () => { toast.error('Failed to delete card'); },
    }
  );

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleSaveCard = (isEdit = false) => {
    if (!form.bankName || !form.last4Digits || !form.creditLimit) {
      toast.error('Please fill all required fields');
      return;
    }
    if (isEdit && editCard) {
      updateCardMutation.mutate({ ...form, id: editCard._id });
    } else {
      addCardMutation.mutate({
        ...form,
        creditLimit: Number(form.creditLimit),
        billingCycleDate: Number(form.billingCycleDate),
      });
    }
  };

  const openEdit = (card: CreditCardData) => {
    setForm({
      bankName: card.bankName,
      cardName: card.cardName,
      last4Digits: card.last4Digits,
      cardType: card.cardType,
      creditLimit: String(card.creditLimit),
      billingCycleDate: String(card.billingCycleDate),
      dueDate: card.dueDate?.slice(0, 10) ?? '',
      color: card.color,
    });
    setEditCard(card);
  };

  // ── Derived ───────────────────────────────────────────────────────────────────

  const cards: CreditCardData[] = cardsQuery.data ?? [];

  const totalLimit = cards.reduce((s, c) => s + c.creditLimit, 0);
  const totalUsed = cards.reduce((s, c) => s + c.currentBalance, 0);
  const totalAvailable = cards.reduce((s, c) => s + c.availableCredit, 0);
  const overallUtilization = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;
  const utilizationColor = overallUtilization >= 75 ? 'error' : overallUtilization >= 40 ? 'warning' : 'success';

  const upcomingDues = cards.filter((c) => daysUntil(c.dueDate) <= 7 && daysUntil(c.dueDate) >= 0);

  // ── Render ───────────────────────────────────────────────────────────────────

  // Rendered via a plain function (not an inline component) so the dialog
  // isn't remounted on every keystroke, which used to drop input focus.
  const renderCardFormDialog = (open: boolean, onClose: () => void, isEdit = false) => (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle>{isEdit ? 'Edit Card' : 'Add New Card'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="Bank Name *" value={form.bankName}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="Card Name" value={form.cardName}
              onChange={(e) => setForm({ ...form, cardName: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="Last 4 Digits *" value={form.last4Digits}
              inputProps={{ maxLength: 4, pattern: '[0-9]*' }}
              onChange={(e) => setForm({ ...form, last4Digits: e.target.value.replace(/\D/g, '') })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Card Type</InputLabel>
              <Select label="Card Type" value={form.cardType}
                onChange={(e) => setForm({ ...form, cardType: e.target.value })}>
                {CARD_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="Credit Limit (₹) *" type="number" value={form.creditLimit}
              onChange={(e) => setForm({ ...form, creditLimit: e.target.value })}
              InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="Billing Cycle Date" type="number"
              value={form.billingCycleDate}
              inputProps={{ min: 1, max: 31 }}
              onChange={(e) => setForm({ ...form, billingCycleDate: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="Due Date" type="date" value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          {/* Color Picker */}
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary" mb={1}>Card Color</Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {PRESET_COLORS.map((color) => (
                <Box
                  key={color}
                  onClick={() => setForm({ ...form, color })}
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: color,
                    cursor: 'pointer',
                    border: form.color === color ? '3px solid var(--fh-text)' : '2px solid rgba(148,163,184,0.25)',
                    boxShadow: form.color === color ? '0 0 0 2px #6366f1' : 'none',
                    boxSizing: 'border-box',
                    transition: 'border 0.15s',
                  }}
                />
              ))}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => handleSaveCard(isEdit)}
          disabled={addCardMutation.isLoading || updateCardMutation.isLoading}
        >
          {isEdit ? 'Save Changes' : 'Add Card'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return (
    <Box>
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
            Credit Cards
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--fh-muted)', mt: 0.5 }}>
            Monitor limits, utilisation and upcoming dues across your cards
          </Typography>
        </Box>
        <Box display="flex" gap={1} alignItems="center">
          <Tooltip title="Refresh">
            <IconButton onClick={() => queryClient.invalidateQueries('credit-cards')} color="primary">
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<Add />} onClick={() => { setForm(defaultForm); setOpenAddDialog(true); }}>
            Add Card
          </Button>
        </Box>
      </Box>

      {/* Upcoming Dues Alert */}
      {upcomingDues.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }} icon={<Warning />}>
          <strong>Upcoming dues:</strong>{' '}
          {upcomingDues.map((c) => (
            <span key={c._id}>
              {c.bankName} {c.cardName} ({formatCurrency(c.currentBalance)}) due in {daysUntil(c.dueDate)} day(s)
            </span>
          )).reduce<React.ReactNode[]>((acc, el, i) => i === 0 ? [el] : [...acc, ', ', el], [])}
        </Alert>
      )}

      {/* Summary Cards */}
      {cardsQuery.isLoading ? (
        <StatCardsSkeleton count={4} />
      ) : (
      <Grid container spacing={{ xs: 2, md: 3 }} sx={{ mb: { xs: 2, md: 4 } }}>
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ borderLeft: '4px solid #6366f1' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Credit Limit</Typography>
              <Typography variant="h5" fontWeight={700}>{formatCurrency(totalLimit)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ borderLeft: '4px solid var(--fh-down)' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Used</Typography>
              <Typography variant="h5" fontWeight={700} color="error.main">{formatCurrency(totalUsed)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ borderLeft: '4px solid var(--fh-up)' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Available Credit</Typography>
              <Typography variant="h5" fontWeight={700} color="success.main">{formatCurrency(totalAvailable)}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ borderLeft: `4px solid ${overallUtilization >= 75 ? 'var(--fh-down)' : overallUtilization >= 40 ? 'var(--fh-warn)' : 'var(--fh-up)'}` }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Overall Utilization</Typography>
              <Typography variant="h5" fontWeight={700}>
                {overallUtilization.toFixed(1)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(overallUtilization, 100)}
                color={utilizationColor}
                sx={{ mt: 1, height: 6, borderRadius: 3 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      )}

      {/* Cards Grid */}
      {cardsQuery.isLoading ? (
        <CardGridSkeleton count={3} height={300} />
      ) : cardsQuery.isError ? (
        <Alert severity="error">Failed to load credit cards. Please refresh.</Alert>
      ) : cards.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <CreditCard sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" gutterBottom sx={{ color: 'var(--fh-text)' }}>No Cards Added</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Add your first credit card to start tracking.
            </Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => setOpenAddDialog(true)}>
              Add Card
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={{ xs: 2, md: 3 }}>
          {cards.map((card) => (
            <Grid item xs={12} sm={6} lg={4} xl={3} key={card._id}>
              <CreditCardVisual
                card={card}
                onViewTx={() => setViewTxCard(card)}
                onEdit={() => openEdit(card)}
                onDelete={() => {
                  if (window.confirm(`Delete ${card.bankName} ${card.cardName}?`)) {
                    deleteCardMutation.mutate(card._id);
                  }
                }}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialogs */}
      {renderCardFormDialog(openAddDialog, () => setOpenAddDialog(false))}
      {renderCardFormDialog(!!editCard, () => { setEditCard(null); setForm(defaultForm); }, true)}

      {/* Transactions Drawer */}
      <TxDrawer
        card={viewTxCard}
        open={!!viewTxCard}
        onClose={() => setViewTxCard(null)}
      />
    </Box>
  );
};

export default CreditCards;
