import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, User, Wallet, PiggyBank } from 'lucide-react';

const styles = `
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
`;

export default function FinanceTracker() {
  const [currentUser] = useState({ uid: 'user-1', email: 'usuario@finanzas.com' });
  const [loading, setLoading] = useState(true);
  
  const [transactions, setTransactions] = useState([]);
  const [transactionType, setTransactionType] = useState('gasto');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('pendiente');
  const [dateFilter, setDateFilter] = useState('mes');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [savings, setSavings] = useState([]);
  const [savingName, setSavingName] = useState('');
  const [savingAmount, setSavingAmount] = useState('');
  const [savingDate, setSavingDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('finanzas');

  const [reminders, setReminders] = useState([]);
  const [reminderName, setReminderName] = useState('');
  const [reminderAmount, setReminderAmount] = useState('');
  const [reminderDueDate, setReminderDueDate] = useState('');
  const [reminderCategory, setReminderCategory] = useState('');
  const [reminderFrequency, setReminderFrequency] = useState('unica');
  const [reminderFilter, setReminderFilter] = useState('todos');

  const ANNUAL_RETURN_RATE = 0.11;

  const reminderCategories = ['Préstamos', 'Tarjetas de Crédito', 'Agua', 'Luz', 'Internet', 'Teléfono', 'Cable/TV', 'Streaming', 'Alquiler', 'Seguro', 'Otros'];

  const categories = {
    gasto: ['Pasaje', 'Préstamos', 'Tarjetas', 'Alquiler', 'Comidas', 'Streaming', 'Agua', 'Luz', 'Internet', 'Imprevistos', 'Salud', 'Gym', 'Gasolina', 'Vehículo', 'Vacaciones', 'Niños', 'Plan', 'Compras', 'Deportes'],
    ingreso: ['Ahorros', 'Salario', 'Quincena', 'Quincena + Incentivo', 'Otros', 'Depósito', 'Comisiones', 'Remesas']
  };

  // Cargar datos al inicio
  useEffect(() => {
    const loadData = async () => {
      try {
        const [transResult, reminderResult, savingResult] = await Promise.all([
          window.storage.get('transactions').catch(() => null),
          window.storage.get('reminders').catch(() => null),
          window.storage.get('savings').catch(() => null)
        ]);
        
        if (transResult?.value) setTransactions(JSON.parse(transResult.value));
        if (reminderResult?.value) setReminders(JSON.parse(reminderResult.value));
        if (savingResult?.value) setSavings(JSON.parse(savingResult.value));
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Guardar transacciones
  useEffect(() => {
    if (!loading) {
      window.storage.set('transactions', JSON.stringify(transactions)).catch(err => 
        console.error('Error guardando transacciones:', err)
      );
    }
  }, [transactions, loading]);

  // Guardar recordatorios
  useEffect(() => {
    if (!loading) {
      window.storage.set('reminders', JSON.stringify(reminders)).catch(err => 
        console.error('Error guardando recordatorios:', err)
      );
    }
  }, [reminders, loading]);

  // Guardar ahorros
  useEffect(() => {
    if (!loading) {
      window.storage.set('savings', JSON.stringify(savings)).catch(err => 
        console.error('Error guardando ahorros:', err)
      );
    }
  }, [savings, loading]);

  // Auto-crear transacciones mensuales
  useEffect(() => {
    if (loading || reminders.length === 0) return;

    const checkAndCreateTransactions = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isFirstDayOfMonth = today.getDate() === 1;

      if (!isFirstDayOfMonth) return;

      reminders.forEach(reminder => {
        if (reminder.frequency === 'mensual') {
          const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          
          const existingTransaction = transactions.find(t => 
            t.reminderId === reminder.id &&
            new Date(t.date) >= firstDayOfMonth &&
            new Date(t.date) <= lastDayOfMonth
          );
          
          if (!existingTransaction) {
            const newTransaction = {
              id: Date.now() + Math.random(),
              userId: currentUser.uid,
              type: 'gasto',
              amount: reminder.amount,
              category: reminder.category,
              description: `${reminder.name}`,
              status: 'pendiente',
              date: today.toISOString(),
              createdAt: new Date().toISOString(),
              fromReminder: true,
              reminderId: reminder.id,
              autoCreated: true
            };
            
            setTransactions(prev => [...prev, newTransaction]);
          }
        }
      });
    };

    checkAndCreateTransactions();
    const interval = setInterval(checkAndCreateTransactions, 21600000);

    return () => clearInterval(interval);
  }, [currentUser, reminders, transactions, loading]);

  const addReminder = () => {
    if (!reminderName || !reminderAmount || !reminderDueDate || !reminderCategory) {
      alert('Por favor completa todos los campos');
      return;
    }

    const cleanAmount = reminderAmount.replace(/,/g, '').replace(/[^\d.]/g, '');
    const numericAmount = parseFloat(cleanAmount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert('Por favor ingresa un monto válido mayor a 0');
      return;
    }

    const newReminder = {
      id: Date.now() + Math.random(),
      userId: currentUser.uid,
      name: reminderName,
      amount: numericAmount,
      dueDate: reminderDueDate,
      category: reminderCategory,
      frequency: reminderFrequency,
      status: 'pendiente',
      createdAt: new Date().toISOString()
    };

    setReminders(prev => [...prev, newReminder].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)));

    setReminderName('');
    setReminderAmount('');
    setReminderDueDate('');
    setReminderCategory('');
    setReminderFrequency('unica');
    alert('Recordatorio agregado exitosamente');
  };

  const deleteReminder = (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este recordatorio? Esto también eliminará las transacciones relacionadas.')) {
      return;
    }

    setTransactions(prev => prev.filter(t => t.reminderId !== id));
    setReminders(prev => prev.filter(r => r.id !== id));
    
    alert('Recordatorio y transacciones relacionadas eliminadas');
  };

  const toggleReminderStatus = (id, currentStatus, reminder) => {
    const newStatus = currentStatus === 'pagado' ? 'pendiente' : 'pagado';
    
    setReminders(prev => prev.map(r => 
      r.id === id 
        ? { ...r, status: newStatus, paidDate: newStatus === 'pagado' ? new Date().toISOString() : null }
        : r
    ));

    const relatedTransactions = transactions.filter(t => t.reminderId === id);

    if (newStatus === 'pagado') {
      if (relatedTransactions.length > 0) {
        setTransactions(prev => prev.map(t => 
          t.reminderId === id 
            ? { ...t, status: 'pagado', paidDate: new Date().toISOString() }
            : t
        ));
      } else {
        const newTransaction = {
          id: Date.now() + Math.random(),
          userId: currentUser.uid,
          type: 'gasto',
          amount: reminder.amount,
          category: reminder.category,
          description: `${reminder.name}`,
          status: 'pagado',
          date: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          fromReminder: true,
          reminderId: id,
          paidDate: new Date().toISOString()
        };
        
        setTransactions(prev => [...prev, newTransaction]);
      }
    } else {
      setTransactions(prev => prev.map(t => 
        t.reminderId === id 
          ? { ...t, status: 'pendiente', paidDate: null }
          : t
      ));
    }
  };

  const handleReminderAmountInput = (value) => {
    const cleaned = value.replace(/[^\d.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    
    let formatted = parts[0];
    if (formatted) {
      formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    
    if (parts.length === 2) {
      formatted = formatted + '.' + parts[1].slice(0, 2);
    }
    
    setReminderAmount(formatted);
  };

  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filterReminders = () => {
    return reminders.filter(reminder => {
      if (reminderFilter === 'todos') return true;
      
      const daysUntil = getDaysUntilDue(reminder.dueDate);
      
      if (reminderFilter === 'pendientes') {
        return reminder.status === 'pendiente' && daysUntil > 7;
      } else if (reminderFilter === 'pronto') {
        return reminder.status === 'pendiente' && daysUntil >= 0 && daysUntil <= 7;
      } else if (reminderFilter === 'vencidos') {
        return reminder.status === 'pendiente' && daysUntil < 0;
      } else if (reminderFilter === 'pagados') {
        return reminder.status === 'pagado';
      }
      
      return true;
    });
  };

  const addTransaction = () => {
    if (!amount || !category) {
      alert('Por favor completa todos los campos');
      return;
    }

    const newTransaction = {
      id: Date.now() + Math.random(),
      userId: currentUser.uid,
      type: transactionType,
      amount: parseFloat(amount),
      category,
      description,
      status: transactionType === 'ingreso' ? 'pagado' : status,
      date: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    setTransactions(prev => [...prev, newTransaction]);

    setAmount('');
    setCategory('');
    setDescription('');
  };

  const deleteTransaction = (id) => {
    const transaction = transactions.find(t => t.id === id);
    
    if (transaction && transaction.reminderId) {
      const reminder = reminders.find(r => r.id === transaction.reminderId);
      if (reminder && reminder.status === 'pagado') {
        setReminders(prev => prev.map(r => 
          r.id === transaction.reminderId 
            ? { ...r, status: 'pendiente', paidDate: null }
            : r
        ));
      }
    }
    
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const toggleStatus = (id, currentStatus) => {
    const newStatus = currentStatus === 'pagado' ? 'pendiente' : 'pagado';
    
    setTransactions(prev => prev.map(t => 
      t.id === id 
        ? { ...t, status: newStatus, paidDate: newStatus === 'pagado' ? new Date().toISOString() : null }
        : t
    ));

    const transaction = transactions.find(t => t.id === id);
    if (transaction && transaction.reminderId) {
      setReminders(prev => prev.map(r => 
        r.id === transaction.reminderId 
          ? { ...r, status: newStatus, paidDate: newStatus === 'pagado' ? new Date().toISOString() : null }
          : r
      ));
    }
  };

  const addSaving = () => {
    if (!savingAmount || !savingName) {
      alert('Por favor completa el nombre y el monto');
      return;
    }

    const cleanAmount = savingAmount.replace(/,/g, '').replace(/[^\d.]/g, '');
    const numericAmount = parseFloat(cleanAmount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert('Por favor ingresa un monto válido mayor a 0');
      return;
    }

    const newSaving = {
      id: Date.now() + Math.random(),
      name: savingName,
      amount: numericAmount,
      date: savingDate,
      addedBy: currentUser.email,
      createdAt: new Date().toISOString()
    };

    setSavings(prev => [...prev, newSaving].sort((a, b) => new Date(b.date) - new Date(a.date)));

    setSavingName('');
    setSavingAmount('');
    setSavingDate(new Date().toISOString().split('T')[0]);
    alert('Ahorro agregado exitosamente');
  };

  const deleteSaving = (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este ahorro?')) {
      return;
    }

    setSavings(prev => prev.filter(s => s.id !== id));
  };

  const calculateCompoundInterest = () => {
    const sortedSavings = [...savings].sort((a, b) => new Date(a.date) - new Date(b.date));
    let history = [];
    let accumulated = 0;
    let totalInterest = 0;

    sortedSavings.forEach((saving) => {
      const savingDate = new Date(saving.date);
      const today = new Date();
      const daysElapsed = Math.max(0, Math.floor((today - savingDate) / (1000 * 60 * 60 * 24)));
      const yearsElapsed = daysElapsed / 365;

      const dailyRate = Math.pow(1 + ANNUAL_RETURN_RATE, 1/365) - 1;
      const amountWithInterest = saving.amount * Math.pow(1 + dailyRate, daysElapsed);
      const interestEarned = amountWithInterest - saving.amount;

      accumulated += amountWithInterest;
      totalInterest += interestEarned;

      history.push({
        ...saving,
        daysElapsed,
        yearsElapsed: yearsElapsed.toFixed(2),
        interestEarned,
        currentValue: amountWithInterest,
        accumulatedTotal: accumulated
      });
    });

    return { history, totalInterest, totalInvested: sortedSavings.reduce((sum, s) => sum + s.amount, 0), accumulated };
  };

  const formatCurrency = (value) => {
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleAmountInput = (value) => {
    const cleaned = value.replace(/[^\d.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    
    let formatted = parts[0];
    if (formatted) {
      formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    
    if (parts.length === 2) {
      formatted = formatted + '.' + parts[1].slice(0, 2);
    }
    
    setSavingAmount(formatted);
  };

  const filterTransactionsByDate = () => {
    const now = new Date(selectedDate);
    return transactions.filter(t => {
      const transDate = new Date(t.date);
      if (dateFilter === 'dia') {
        return transDate.toDateString() === now.toDateString();
      } else if (dateFilter === 'mes') {
        return transDate.getMonth() === now.getMonth() && 
               transDate.getFullYear() === now.getFullYear();
      } else {
        return transDate.getFullYear() === now.getFullYear();
      }
    });
  };

  const filteredTransactions = filterTransactionsByDate();
  const totalIngresos = filteredTransactions
    .filter(t => t.type === 'ingreso' && t.status === 'pagado')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalGastos = filteredTransactions
    .filter(t => t.type === 'gasto' && t.status === 'pagado')
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIngresos - totalGastos;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
        <div className="text-white text-2xl">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <style>{styles}</style>
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-3 sm:px-4">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <User className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              <div>
                <h1 className="text-base sm:text-xl font-bold text-gray-800">Mis Finanzas</h1>
                <p className="text-xs text-gray-600 truncate max-w-[150px] sm:max-w-none">{currentUser?.email}</p>
              </div>
            </div>
          </div>

          {/* Tabs de navegación */}
          <div className="flex gap-1 sm:gap-2 border-t border-gray-200 pt-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setActiveTab('finanzas')}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-t-lg font-semibold transition whitespace-nowrap text-sm ${
                activeTab === 'finanzas'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
              Finanzas
            </button>
            <button
              onClick={() => setActiveTab('ahorros')}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-t-lg font-semibold transition whitespace-nowrap text-sm ${
                activeTab === 'ahorros'
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <PiggyBank className="w-4 h-4 sm:w-5 sm:h-5" />
              Ahorros
            </button>
            <button
              onClick={() => setActiveTab('recordatorios')}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-t-lg font-semibold transition whitespace-nowrap text-sm ${
                activeTab === 'recordatorios'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Recordatorios
            </button>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-6xl mx-auto p-3 sm:p-4 pb-20">
        {activeTab === 'finanzas' && (
          <>
            {/* Dashboard */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Dashboard</h2>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <button onClick={() => setDateFilter('dia')} className={`flex-1 sm:flex-none px-3 py-2 rounded-lg font-semibold text-xs ${dateFilter === 'dia' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Día</button>
                  <button onClick={() => setDateFilter('mes')} className={`flex-1 sm:flex-none px-3 py-2 rounded-lg font-semibold text-xs ${dateFilter === 'mes' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Mes</button>
                  <button onClick={() => setDateFilter('ano')} className={`flex-1 sm:flex-none px-3 py-2 rounded-lg font-semibold text-xs ${dateFilter === 'ano' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Año</button>
                  <input type="date" value={selectedDate.toISOString().split('T')[0]} onChange={(e) => setSelectedDate(new Date(e.target.value))} className="flex-1 sm:flex-none px-3 py-2 border rounded-lg text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                <div className="text-center p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Ingresos</p>
                  <p className="text-lg sm:text-xl font-bold text-green-600">${formatCurrency(totalIngresos)}</p>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-red-50 to-red-100 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Gastos</p>
                  <p className="text-lg sm:text-xl font-bold text-red-600">${formatCurrency(totalGastos)}</p>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Balance</p>
                  <p className={`text-lg sm:text-xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>${formatCurrency(Math.abs(balance))}</p>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Pendientes</p>
                  <p className="text-lg sm:text-xl font-bold text-yellow-600">{filteredTransactions.filter(t => t.type === 'gasto' && t.status === 'pendiente').length}</p>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Pagados</p>
                  <p className="text-lg sm:text-xl font-bold text-emerald-600">{filteredTransactions.filter(t => t.type === 'gasto' && t.status === 'pagado').length}</p>
                </div>
                <div className="text-center p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Total</p>
                  <p className="text-lg sm:text-xl font-bold text-purple-600">{filteredTransactions.length}</p>
                </div>
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Gastos por Categoría</h3>
                  <div className="space-y-3">
                    {(() => {
                      const categoryTotals = {};
                      filteredTransactions
                        .filter(t => t.type === 'gasto' && t.status === 'pagado')
                        .forEach(t => {
                          categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
                        });
                      
                      const sortedCategories = Object.entries(categoryTotals)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 6);

                      const maxAmount = sortedCategories[0]?.[1] || 1;

                      return sortedCategories.length > 0 ? (
                        sortedCategories.map(([category, amount]) => (
                          <div key={category} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-semibold text-gray-700">{category}</span>
                              <span className="text-gray-600">${formatCurrency(amount)}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all"
                                style={{ width: `${(amount / maxAmount) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-8">No hay datos de ingresos</p>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Agregar */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4">
              <h2 className="text-lg sm:text-xl font-bold mb-3">Nueva Transacción</h2>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setTransactionType('gasto')} className={`flex-1 py-2 rounded-lg font-semibold text-sm ${transactionType === 'gasto' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}>Gasto</button>
                <button onClick={() => setTransactionType('ingreso')} className={`flex-1 py-2 rounded-lg font-semibold text-sm ${transactionType === 'ingreso' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>Ingreso</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Monto" className="px-3 py-2 border rounded-lg text-sm" />
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
                  <option value="">Categoría</option>
                  {categories[transactionType].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción (opcional)" className="px-3 py-2 border rounded-lg text-sm" />
                {transactionType === 'gasto' && (
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
                    <option value="pendiente">Pendiente</option>
                    <option value="pagado">Pagado</option>
                  </select>
                )}
              </div>
              <button onClick={addTransaction} className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 flex items-center justify-center gap-2 text-sm">
                <PlusCircle className="w-4 h-4" />Agregar
              </button>
            </div>

            {/* Historial */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold mb-3">Historial</h2>
              <div className="space-y-2">
                {filteredTransactions.length === 0 ? (
                  <p className="text-gray-500 text-center py-8 text-sm">No hay transacciones</p>
                ) : (
                  filteredTransactions.map(transaction => (
                    <div key={transaction.id} className="border rounded-lg p-3 hover:shadow-md transition">
                      <div className="flex flex-col sm:flex-row justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${transaction.type === 'ingreso' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {transaction.type === 'ingreso' ? 'Ingreso' : 'Gasto'}
                            </span>
                            <span className="font-semibold text-sm">{transaction.category}</span>
                          </div>
                          <p className="text-xs text-gray-600">{transaction.description || 'Sin descripción'}</p>
                          <p className="text-xs text-gray-400 mt-1">{new Date(transaction.date).toLocaleDateString('es-ES')}</p>
                        </div>
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2">
                          <span className={`text-xl font-bold ${transaction.type === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                            ${transaction.amount.toFixed(2)}
                          </span>
                          <div className="flex gap-2">
                            {transaction.type === 'gasto' && (
                              <button onClick={() => toggleStatus(transaction.id, transaction.status)} className={`px-2 py-1 rounded text-xs font-semibold ${transaction.status === 'pagado' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'}`}>
                                {transaction.status === 'pagado' ? '✓' : '⏱'}
                              </button>
                            )}
                            <button onClick={() => deleteTransaction(transaction.id)} className="bg-red-500 text-white p-1.5 rounded hover:bg-red-600">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'ahorros' && (
          <>
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg shadow-lg p-4 sm:p-6 mb-4">
              <div className="flex items-center gap-3">
                <PiggyBank className="w-8 h-8 sm:w-10 sm:h-10" />
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">Inversión</h2>
                  <p className="text-sm text-purple-100">Retorno: 11% anual</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">
              {(() => {
                const { totalInvested, totalInterest, accumulated } = calculateCompoundInterest();
                return (
                  <>
                    <div className="bg-blue-500 text-white rounded-lg shadow-lg p-4">
                      <p className="text-sm">Invertido</p>
                      <p className="text-2xl sm:text-3xl font-bold">${formatCurrency(totalInvested)}</p>
                    </div>
                    <div className="bg-green-500 text-white rounded-lg shadow-lg p-4">
                      <p className="text-sm">Intereses</p>
                      <p className="text-2xl sm:text-3xl font-bold">${formatCurrency(totalInterest)}</p>
                    </div>
                    <div className="bg-purple-500 text-white rounded-lg shadow-lg p-4">
                      <p className="text-sm">Total</p>
                      <p className="text-2xl sm:text-3xl font-bold">${formatCurrency(accumulated)}</p>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4">
              <h2 className="text-lg sm:text-xl font-bold mb-3">Agregar Ahorro</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                <input type="text" value={savingName} onChange={(e) => setSavingName(e.target.value)} placeholder="Nombre" className="px-3 py-2 border rounded-lg text-sm" />
                <input type="text" value={savingAmount} onChange={(e) => handleAmountInput(e.target.value)} placeholder="5,000.00" className="px-3 py-2 border rounded-lg text-sm" />
                <input type="date" value={savingDate} onChange={(e) => setSavingDate(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
              </div>
              <button onClick={addSaving} className="w-full bg-purple-600 text-white py-2 rounded-lg font-semibold hover:bg-purple-700 flex items-center justify-center gap-2 text-sm">
                <PlusCircle className="w-4 h-4" />Agregar
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold mb-3">Historial</h2>
              <div className="space-y-3">
                {savings.length === 0 ? (
                  <p className="text-gray-500 text-center py-8 text-sm">No hay ahorros</p>
                ) : (
                  calculateCompoundInterest().history.map((saving) => (
                    <div key={saving.id} className="border-2 border-purple-200 rounded-lg p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-indigo-50">
                      <div className="flex flex-col sm:flex-row justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-sm sm:text-base">{saving.name}</span>
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">{new Date(saving.date).toLocaleDateString('es-ES')}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                            <div><span className="text-gray-500">Capital:</span> <span className="font-bold">${formatCurrency(saving.amount)}</span></div>
                            <div><span className="text-gray-500">Interés:</span> <span className="font-bold text-green-600">+${formatCurrency(saving.interestEarned)}</span></div>
                            <div><span className="text-gray-500">Valor:</span> <span className="font-bold">${formatCurrency(saving.currentValue)}</span></div>
                            <div><span className="text-gray-500">Días:</span> <span className="font-bold">{saving.daysElapsed}</span></div>
                          </div>
                        </div>
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2">
                          <div className="text-center bg-purple-100 rounded-lg p-2">
                            <p className="text-xs text-purple-600">Acumulado</p>
                            <p className="text-lg sm:text-xl font-bold text-purple-700">${formatCurrency(saving.accumulatedTotal)}</p>
                          </div>
                          <button onClick={() => deleteSaving(saving.id)} className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 flex items-center gap-1 text-xs">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'recordatorios' && (
          <>
            <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg shadow-lg p-4 sm:p-6 mb-4">
              <div className="flex items-center gap-3">
                <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">Recordatorios</h2>
                  <p className="text-sm text-orange-100">Pagos y Servicios</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {(() => {
                const pendingReminders = reminders.filter(r => r.status === 'pendiente');
                const totalPending = pendingReminders.reduce((sum, r) => sum + r.amount, 0);
                const overdueReminders = pendingReminders.filter(r => getDaysUntilDue(r.dueDate) < 0);
                const dueSoonReminders = pendingReminders.filter(r => {
                  const days = getDaysUntilDue(r.dueDate);
                  return days >= 0 && days <= 7;
                });
                return (
                  <>
                    <div className="bg-white rounded-lg shadow-md p-3 border-l-4 border-orange-500">
                      <p className="text-xs text-gray-600 mb-1">Total</p>
                      <p className="text-xl sm:text-2xl font-bold text-orange-600">{reminders.length}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-3 border-l-4 border-red-500">
                      <p className="text-xs text-gray-600 mb-1">Pendiente</p>
                      <p className="text-xl sm:text-2xl font-bold text-red-600">${formatCurrency(totalPending)}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-3 border-l-4 border-yellow-500">
                      <p className="text-xs text-gray-600 mb-1">Pronto</p>
                      <p className="text-xl sm:text-2xl font-bold text-yellow-600">{dueSoonReminders.length}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-3 border-l-4 border-purple-500">
                      <p className="text-xs text-gray-600 mb-1">Vencidos</p>
                      <p className="text-xl sm:text-2xl font-bold text-purple-600">{overdueReminders.length}</p>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4">
              <h2 className="text-lg sm:text-xl font-bold mb-3">Agregar Recordatorio</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                <input type="text" value={reminderName} onChange={(e) => setReminderName(e.target.value)} placeholder="Nombre" className="px-3 py-2 border rounded-lg text-sm" />
                <input type="text" value={reminderAmount} onChange={(e) => handleReminderAmountInput(e.target.value)} placeholder="5,000.00" className="px-3 py-2 border rounded-lg text-sm" />
                <input type="date" value={reminderDueDate} onChange={(e) => setReminderDueDate(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" />
                <select value={reminderCategory} onChange={(e) => setReminderCategory(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
                  <option value="">Categoría</option>
                  {reminderCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
                <select value={reminderFrequency} onChange={(e) => setReminderFrequency(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
                  <option value="unica">Única vez</option>
                  <option value="mensual">Mensual</option>
                  <option value="quincenal">Quincenal</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
              <button onClick={addReminder} className="w-full bg-orange-600 text-white py-2 rounded-lg font-semibold hover:bg-orange-700 flex items-center justify-center gap-2 text-sm">
                <PlusCircle className="w-4 h-4" />Agregar
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-3">
                <h2 className="text-lg sm:text-xl font-bold">Mis Recordatorios</h2>
                <div className="flex gap-2 flex-wrap w-full sm:w-auto">
                  <button onClick={() => setReminderFilter('todos')} className={`flex-1 sm:flex-none px-3 py-1 rounded-lg font-semibold text-xs ${reminderFilter === 'todos' ? 'bg-orange-600 text-white' : 'bg-gray-200'}`}>
                    Todos ({reminders.length})
                  </button>
                  <button onClick={() => setReminderFilter('pendientes')} className={`flex-1 sm:flex-none px-3 py-1 rounded-lg font-semibold text-xs ${reminderFilter === 'pendientes' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
                    Pendientes
                  </button>
                  <button onClick={() => setReminderFilter('pronto')} className={`flex-1 sm:flex-none px-3 py-1 rounded-lg font-semibold text-xs ${reminderFilter === 'pronto' ? 'bg-yellow-600 text-white' : 'bg-gray-200'}`}>
                    Pronto
                  </button>
                  <button onClick={() => setReminderFilter('vencidos')} className={`flex-1 sm:flex-none px-3 py-1 rounded-lg font-semibold text-xs ${reminderFilter === 'vencidos' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}>
                    Vencidos
                  </button>
                  <button onClick={() => setReminderFilter('pagados')} className={`flex-1 sm:flex-none px-3 py-1 rounded-lg font-semibold text-xs ${reminderFilter === 'pagados' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}>
                    Pagados
                  </button>
                </div>
              </div>
              <div className="space-y-2 sm:space-y-3">
                {filterReminders().length === 0 ? (
                  <p className="text-gray-500 text-center py-8 text-sm">No hay recordatorios</p>
                ) : (
                  filterReminders().map((reminder) => {
                    const daysUntil = getDaysUntilDue(reminder.dueDate);
                    const isOverdue = daysUntil < 0;
                    const isDueSoon = daysUntil >= 0 && daysUntil <= 7;
                    
                    return (
                      <div key={reminder.id} className={`border-2 rounded-lg p-3 sm:p-4 ${reminder.status === 'pagado' ? 'border-green-200 bg-green-50' : isOverdue ? 'border-red-300 bg-red-50' : isDueSoon ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-white'}`}>
                        <div className="flex flex-col sm:flex-row justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="font-bold text-sm sm:text-base">{reminder.name}</span>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${reminder.status === 'pagado' ? 'bg-green-100 text-green-800' : isOverdue ? 'bg-red-100 text-red-800' : isDueSoon ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                                {reminder.status === 'pagado' ? 'Pagado' : isOverdue ? `Vencido (${Math.abs(daysUntil)}d)` : isDueSoon ? `${daysUntil}d` : `${daysUntil}d`}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div><span className="text-gray-500">Categoría:</span> <span className="font-semibold">{reminder.category}</span></div>
                              <div><span className="text-gray-500">Frecuencia:</span> <span className="font-semibold capitalize">{reminder.frequency}</span></div>
                              <div><span className="text-gray-500">Vence:</span> <span className="font-semibold">{new Date(reminder.dueDate).toLocaleDateString('es-ES')}</span></div>
                            </div>
                          </div>
                          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2">
                            <p className="text-xl sm:text-2xl font-bold text-orange-600">${formatCurrency(reminder.amount)}</p>
                            <div className="flex gap-2">
                              <button onClick={() => toggleReminderStatus(reminder.id, reminder.status, reminder)} className={`px-3 py-1 sm:py-2 rounded-lg font-semibold text-xs ${reminder.status === 'pagado' ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-green-500 text-white hover:bg-green-600'}`}>
                                {reminder.status === 'pagado' ? 'Desmarcar' : 'Pagar'}
                              </button>
                              <button onClick={() => deleteReminder(reminder.id)} className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}-between text-sm">
                              <span className="font-semibold text-gray-700">{category}</span>
                              <span className="text-gray-600">${formatCurrency(amount)}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all"
                                style={{ width: `${(amount / maxAmount) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-center py-8">No hay datos de gastos</p>
                      );
                    })()}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Ingresos por Categoría</h3>
                  <div className="space-y-3">
                    {(() => {
                      const categoryTotals = {};
                      filteredTransactions
                        .filter(t => t.type === 'ingreso')
                        .forEach(t => {
                          categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
                        });
                      
                      const sortedCategories = Object.entries(categoryTotals)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 6);

                      const maxAmount = sortedCategories[0]?.[1] || 1;

                      return sortedCategories.length > 0 ? (
                        sortedCategories.map(([category, amount]) => (
                          <div key={category} className="space-y-1">
                            <div className="flex justify
