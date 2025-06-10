import React, { useState } from 'react';
import { Box, Grid, Card, CardContent, Typography, Button, TextField, Select, MenuItem, InputLabel, FormControl, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { Download } from 'lucide-react';

const mockPayments = [
  { id: 1, member: 'John Doe', amount: 100, date: '2024-06-01', method: 'Credit Card', notes: 'June payment' },
  { id: 2, member: 'Jane Smith', amount: 75, date: '2024-05-15', method: 'Cash', notes: 'May payment' },
];

const AdminPaymentsMUI = () => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  const [payments, setPayments] = useState(mockPayments);

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 4 } }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Typography variant="h4" fontWeight="bold">Payments (MUI)</Typography>
        <Button variant="outlined" startIcon={<Download />}>Export CSV</Button>
      </Box>
      {/* Record Payment Form */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" mb={2}>Record Payment</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField label="Amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} fullWidth />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} label="Payment Method">
                  <MenuItem value="Credit Card">Credit Card</MenuItem>
                  <MenuItem value="Cash">Cash</MenuItem>
                  <MenuItem value="Check">Check</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="Notes" value={notes} onChange={e => setNotes(e.target.value)} fullWidth />
            </Grid>
            <Grid item xs={12} md={2} display="flex" alignItems="center">
              <Button variant="contained" color="primary" fullWidth>Save</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      {/* Payments Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" mb={2}>Payment Records</Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Member</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Method</TableCell>
                  <TableCell>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.member}</TableCell>
                    <TableCell>${p.amount}</TableCell>
                    <TableCell>{p.date}</TableCell>
                    <TableCell>{p.method}</TableCell>
                    <TableCell>{p.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdminPaymentsMUI; 