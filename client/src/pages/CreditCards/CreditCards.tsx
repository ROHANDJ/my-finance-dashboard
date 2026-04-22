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
  Skeleton,
  Drawer,
  Divider,
  Tooltip,
  InputAdornment,
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

  const utilizationColor = utilization >= 75 ? '#F44336' : utilization >= 40 ? '#FF9800' : '#4CAF50';

  return (
    <Card
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        boxShadow: 4,
        transition: 'transform 0.2s',
        '&:hover': { transform: 'translateY(-4px)' },
      }}
    >
      {/* Card Face */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}cc 100%)`,
          p: 3,
          color: 'white',
          position: 'relative',
          minHeight: 160,
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h6" fontWeight={700} sx={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
              {card.bankName}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              {card.cardName}
            </Typography>
          </Box>
          <Box display="flex" gap={0.5}>
            <IconButton size="small" sx={{ color: 'white', opacity: 0.8 }} onClick={onEdit}>
              <Edit fontSize="small" />
            </IconButton>
            <IconButton size="small" sx={{ color: 'white', opacity: 0.8 }} onClick={onDelete}>
              <Delete fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Typography
          variant="h5"
          fontWeight={600}
          sx={{ mt: 3, letterSpacing: 4, fontFamily: 'monospace' }}
        >
          **** **** **** {card.last4Digits}
        </Typography>

        <Box display="flex" justifyContent="space-between" alignItems="flex-end" mt={2}>
          <Box>
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
              position: 'absolute',
              top: 12,
              right: 56,
              backgroundColor: '#F44336',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.65rem',
            }}
          />
        )}
      </Box>

      {/* Card Details */}
      <CardContent>
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
          <Box display="flex" justifyContent="space-between">
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
          sx={{ mt: 1 }}
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
        <Box sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                {card?.bankName} — {card?.cardName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                **** {card?.last4Digits}
              </Typography>
            </Box>
            <IconButton onClick={onClose}><Close /></IconButton>
          </Box>

          {/* Month Total */}
          <Card sx={{ mb: 2, backgroundColor: 'primary.main', color: 'white' }}>
            <CardContent sx={{ py: '12px !important' }}>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>This Month's Spend</Typography>
              <Typography variant="h5" fontWeight={700}>{formatCurrency(thisMonthTotal)}</Typography>
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
              <Box>{[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1, borderRadius: 1 }} />
              ))}</Box>
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
                  py={1.5}
                  borderBottom="1px solid"
                  borderColor="divider"
                >
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        backgroundColor: tx.type === 'debit' ? '#FFEBEE' : '#E8F5E9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {tx.type === 'debit'
                        ? <TrendingDown sx={{ color: '#F44336', fontSize: 18 }} />
                        : <TrendingUp sx={{ color: '#4CAF50', fontSize: 18 }} />}
                    </Box>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {tx.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {tx.merchantName ? `${tx.merchantName} · ` : ''}{tx.category} · {new Date(tx.date).toLocaleDateString('en-IN')}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    color={tx.type === 'debit' ? 'error.main' : 'success.main'}
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
      <Dialog open={openTxDialog} onClose={() => setOpenTxDialog(false)} maxWidth="xs" fullWidth>
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

  const CardFormDialog: React.FC<{ open: boolean; onClose: () => void; isEdit?: boolean }> = ({
    open, onClose, isEdit = false,
  }) => (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
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
                    border: form.color === color ? '3px solid #1976d2' : '2px solid transparent',
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={600}>Credit Cards</Typography>
        <Box display="flex" gap={1}>
          <IconButton onClick={() => queryClient.invalidateQueries('credit-cards')} color="primary">
            <Refresh />
          </IconButton>
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
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ borderLeft: '4px solid #1976d2' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Credit Limit</Typography>
              {cardsQuery.isLoading
                ? <Skeleton variant="text" width={120} height={40} />
                : <Typography variant="h5" fontWeight={700}>{formatCurrency(totalLimit)}</Typography>}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ borderLeft: '4px solid #F44336' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Total Used</Typography>
              {cardsQuery.isLoading
                ? <Skeleton variant="text" width={120} height={40} />
                : <Typography variant="h5" fontWeight={700} color="error.main">{formatCurrency(totalUsed)}</Typography>}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ borderLeft: '4px solid #4CAF50' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Available Credit</Typography>
              {cardsQuery.isLoading
                ? <Skeleton variant="text" width={120} height={40} />
                : <Typography variant="h5" fontWeight={700} color="success.main">{formatCurrency(totalAvailable)}</Typography>}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ borderLeft: `4px solid ${overallUtilization >= 75 ? '#F44336' : overallUtilization >= 40 ? '#FF9800' : '#4CAF50'}` }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">Overall Utilization</Typography>
              {cardsQuery.isLoading ? (
                <Skeleton variant="text" width={120} height={40} />
              ) : (
                <>
                  <Typography variant="h5" fontWeight={700}>
                    {overallUtilization.toFixed(1)}%
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(overallUtilization, 100)}
                    color={utilizationColor}
                    sx={{ mt: 1, height: 6, borderRadius: 3 }}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Cards Grid */}
      {cardsQuery.isLoading ? (
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 3 }} />
            </Grid>
          ))}
        </Grid>
      ) : cardsQuery.isError ? (
        <Alert severity="error">Failed to load credit cards. Please refresh.</Alert>
      ) : cards.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 8 }}>
            <CreditCard sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" gutterBottom>No Cards Added</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Add your first credit card to start tracking.
            </Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => setOpenAddDialog(true)}>
              Add Card
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {cards.map((card) => (
            <Grid item xs={12} sm={6} md={4} key={card._id}>
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
      <CardFormDialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} />
      <CardFormDialog open={!!editCard} onClose={() => { setEditCard(null); setForm(defaultForm); }} isEdit />

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
