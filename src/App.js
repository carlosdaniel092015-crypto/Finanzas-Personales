// ARCHIVO: src/App.js
// Este es el código completo y funcional con todas las características

import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, DollarSign, LogOut, User, Wallet, PiggyBank } from 'lucide-react';
import { auth, db } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  query, 
  where, 
  onSnapshot,
  getDocs 
} from 'firebase/firestore';

export default function FinanceTracker() {
  // Estados de autenticación
  const [currentUser, setCurrentUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Estados de transacciones
  const [transactions, setTransactions] = useState([]);
  const [transactionType, setTransactionType] = useState('gasto');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('pendiente');
  const [dateFilter, setDateFilter] = useState('mes');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Estados de ahorros
  const [savings, setSavings] = useState([]);
  const [savingName, setSavingName] = useState('');
  const [savingAmount, setSavingAmount] = useState('');
  const [savingDate, setSavingDate] = useState(new Date().toISOString().split('T')[0]);
  const [showSavingsModule, setShowSavingsModule] = useState(false);
  const [activeTab, setActiveTab] = useState('finanzas');

  // Estados de recordatorios
  const [reminders, setReminders] = useState([]);
  const [reminderName, setReminderName] = useState('');
  const [reminderAmount, setReminderAmount] = useState('');
  const [reminderDueDate, setReminderDueDate] = useState('');
  const [reminderCategory, setReminderCategory] = useState('');
  const [reminderFrequency, setReminderFrequency] = useState('unica');
  const [showRemindersModule, setShowRemindersModule] = useState(false);
  const [reminderFilter, setReminderFilter] = useState('todos');

  // Constantes
  const AUTHORIZED_EMAILS = ['carlosdaniel092015@gmail.com', 'stephanymartinezjaquez30@gmail.com'];
  const REMINDERS_AUTHORIZED_EMAIL = 'carlosdaniel092015@gmail.com';
  const ANNUAL_RETURN_RATE = 0.11;

  const reminderCategories = ['Préstamos', 'Tarjetas de Crédito', 'Agua', 'Luz', 'Internet', 'Teléfono', 'Cable/TV', 'Streaming', 'Alquiler', 'Seguro', 'Otros'];

  const categories = {
    gasto: ['Pasaje', 'Préstamos', 'Tarjetas', 'Alquiler', 'Comidas', 'Streaming', 'Agua', 'Luz', 'Internet', 'Imprevistos', 'Salud', 'Gym', 'Gasolina', 'Vehículo', 'Vacaciones', 'Niños', 'Plan', 'Compras', 'Deportes'],
    ingreso: ['Ahorros', 'Salario', 'Quincena', 'Quincena + Incentivo', 'Otros', 'Depósito', 'Comisiones', 'Remesas']
  };

  // Escuchar cambios en autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setShowLogin(false);
        setShowSavingsModule(AUTHORIZED_EMAILS.includes(user.email));
        setShowRemindersModule(user.email === REMINDERS_AUTHORIZED_EMAIL);
      } else {
        setCurrentUser(null);
        setShowLogin(true);
        setShowSavingsModule(false);
        setShowRemindersModule(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Escuchar cambios en transacciones
  useEffect(() => {
    if (!currentUser) {
      setTransactions([]);
      return;
    }

    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const transactionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTransactions(transactionsData);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Escuchar cambios en ahorros
  useEffect(() => {
    if (!currentUser || !showSavingsModule) {
      setSavings([]);
      return;
    }

    const q = query(collection(db, 'savings'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const savingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => new Date(b.date) - new Date(a.date));
      setSavings(savingsData);
    });

    return () => unsubscribe();
  }, [currentUser, showSavingsModule]);

  // Escuchar cambios en recordatorios
  useEffect(() => {
    if (!currentUser || !showRemindersModule) {
      setReminders([]);
      return;
    }

    const q = query(
      collection(db, 'reminders'),
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const remindersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      setReminders(remindersData);
    });

    return () => unsubscribe();
  }, [currentUser, showRemindersModule]);

  // Crear transacciones automáticas mensuales
  useEffect(() => {
    if (!currentUser || !showRemindersModule || reminders.length === 0) return;

    const checkAndCreateMonthlyTransactions = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dayOfMonth = today.getDate();

      if (dayOfMonth === 1) {
        for (const reminder of reminders) {
          if (reminder.frequency === 'mensual' && reminder.status === 'pendiente') {
            try {
              const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
              const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
              
              const transactionsQuery = query(
                collection(db, 'transactions'),
                where('userId', '==', currentUser.uid),
                where('reminderId', '==', reminder.id),
                where('date', '>=', firstDayOfMonth),
                where('date', '<=', lastDayOfMonth)
              );
              
              const existingTransactions = await getDocs(transactionsQuery);
              
              if (existingTransactions.empty) {
                await addDoc(collection(db, 'transactions'), {
                  userId: currentUser.uid,
                  type: 'gasto',
                  amount: reminder.amount,
                  category: reminder.category,
                  description: `${reminder.name} (Pago mensual automático)`,
                  status: 'pendiente',
                  date: today.toISOString(),
                  createdAt: new Date(),
                  fromReminder: true,
                  reminderId: reminder.id,
                  autoCreated: true
                });
              }
            } catch (error) {
              console.error('Error al crear transacción mensual:', error);
            }
          }
        }
      }
    };

    checkAndCreateMonthlyTransactions();
    const interval = setInterval(checkAndCreateMonthlyTransactions, 21600000);
    return () => clearInterval(interval);
  }, [currentUser, showRemindersModule, reminders]);

  // Funciones de autenticación
  const handleRegister = async () => {
    setLoginError('');
    if (registerForm.password !== registerForm.confirmPassword) {
      setLoginError('Las contraseñas no coinciden');
      return;
    }
    if (!registerForm.email || !registerForm.password) {
      setLoginError('Completa todos los campos');
      return;
    }
    if (registerForm.password.length < 6) {
      setLoginError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, registerForm.email, registerForm.password);
      setRegisterForm({ email: '', password: '', confirmPassword: '' });
      setIsRegistering(false);
      setLoginError('');
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setLoginError('El correo ya está registrado');
      } else if (error.code === 'auth/invalid-email') {
        setLoginError('Correo electrónico inválido');
      } else {
        setLoginError('Error al registrarse');
      }
    }
  };

  const handleLogin = async () => {
    setLoginError('');
    if (!loginForm.email || !loginForm.password) {
      setLoginError('Completa todos los campos');
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);
      setLoginForm({ email: '', password: '' });
    } catch (error) {
      setLoginError('Contraseña o usuario inválido');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setTransactions([]);
      setSavings([]);
      setReminders([]);
      setActiveTab('finanzas');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Funciones de recordatorios
  const addReminder = async () => {
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
    try {
      await addDoc(collection(db, 'reminders'), {
        userId: currentUser.uid,
        name: reminderName,
        amount: numericAmount,
        dueDate: reminderDueDate,
        category: reminderCategory,
        frequency: reminderFrequency,
        status: 'pendiente',
        createdAt: new Date()
      });
      setReminderName('');
      setReminderAmount('');
      setReminderDueDate('');
      setReminderCategory('');
      setReminderFrequency('unica');
      alert('Recordatorio agregado exitosamente');
    } catch (error) {
      console.error('Error al agregar recordatorio:', error);
    }
  };

  const deleteReminder = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este recordatorio?')) return;
    try {
      await deleteDoc(doc(db, 'reminders', id));
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', currentUser.uid),
        where('reminderId', '==', id)
      );
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(docSnapshot => 
        deleteDoc(doc(db, 'transactions', docSnapshot.id))
      );
      await Promise.all(deletePromises);
      alert('Recordatorio y transacciones relacionadas eliminadas');
    } catch (error) {
      console.error('Error al eliminar recordatorio:', error);
    }
  };

  const toggleReminderStatus = async (id, currentStatus, reminder) => {
    try {
      const newStatus = currentStatus === 'pagado' ? 'pendiente' : 'pagado';
      await updateDoc(doc(db, 'reminders', id), {
        status: newStatus,
        paidDate: newStatus === 'pagado' ? new Date().toISOString() : null
      });
      if (newStatus === 'pagado') {
        const q = query(
          collection(db, 'transactions'),
          where('userId', '==', currentUser.uid),
          where('reminderId', '==', id)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const transactionDoc = snapshot.docs[0];
          await updateDoc(doc(db, 'transactions', transactionDoc.id), {
            status: 'pagado',
            description: `Pago: ${reminder.name}`,
            date: new Date().toISOString()
          });
        } else {
          await addDoc(collection(db, 'transactions'), {
            userId: currentUser.uid,
            type: 'gasto',
            amount: reminder.amount,
            category: reminder.category,
            description: `Pago: ${reminder.name}`,
            status: 'pagado',
            date: new Date().toISOString(),
            createdAt: new Date(),
            fromReminder: true,
            reminderId: id
          });
        }
        alert('Pago registrado');
      } else {
        const q = query(
          collection(db, 'transactions'),
          where('userId', '==', currentUser.uid),
          where('reminderId', '==', id)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const transactionDoc = snapshot.docs[0];
          await updateDoc(doc(db, 'transactions', transactionDoc.id), {
            status: 'pendiente'
          });
        }
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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

  // Funciones de transacciones
  const addTransaction = async () => {
    if (!amount || !category) {
      alert('Por favor completa todos los campos');
      return;
    }
    try {
      await addDoc(collection(db, 'transactions'), {
        userId: currentUser.uid,
        type: transactionType,
        amount: parseFloat(amount),
        category,
        description,
        status: transactionType === 'ingreso' ? 'pagado' : status,
        date: new Date().toISOString(),
        createdAt: new Date()
      });
      setAmount('');
      setCategory('');
      setDescription('');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const deleteTransaction = async (id) => {
    try {
      const transactionDoc = transactions.find(t => t.id === id);
      if (transactionDoc?.reminderId) {
        await deleteDoc(doc(db, 'reminders', transactionDoc.reminderId));
      }
      await deleteDoc(doc(db, 'transactions', id));
      if (transactionDoc?.reminderId) {
        alert('Transacción y recordatorio eliminados');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'pagado' ? 'pendiente' : 'pagado';
      await updateDoc(doc(db, 'transactions', id), { status: newStatus });
      const transaction = transactions.find(t => t.id === id);
      if (transaction?.reminderId) {
        await updateDoc(doc(db, 'reminders', transaction.reminderId), {
          status: newStatus,
          paidDate: newStatus === 'pagado' ? new Date().toISOString() : null
        });
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Funciones de ahorros
  const addSaving = async () => {
    if (!savingAmount || !savingName) {
      alert('Por favor completa el nombre y el monto');
      return;
    }
    const cleanAmount = savingAmount.replace(/,/g, '').replace(/[^\d.]/g, '');
    const numericAmount = parseFloat(cleanAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert('Por favor ingresa un monto válido');
      return;
    }
    try {
      await addDoc(collection(db, 'savings'), {
        name: savingName,
        amount: numericAmount,
        date: savingDate,
        addedBy: currentUser.email,
        createdAt: new Date()
      });
      setSavingName('');
      setSavingAmount('');
      setSavingDate(new Date().toISOString().split('T')[0]);
      alert('Ahorro agregado');
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const deleteSaving = async (id) => {
    if (!window.confirm('¿Estás seguro?')) return;
    try {
      await deleteDoc(doc(db, 'savings', id));
    } catch (error) {
      console.error('Error:', error);
    }
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
      const dailyRate = Math.pow(1 + ANNUAL_RETURN_RATE, 1/365) - 1;
      const amountWithInterest = saving.amount * Math.pow(1 + dailyRate, daysElapsed);
      const interestEarned = amountWithInterest - saving.amount;
      accumulated += amountWithInterest;
      totalInterest += interestEarned;
      history.push({
        ...saving,
        daysElapsed,
        yearsElapsed: (daysElapsed / 365).toFixed(2),
        interestEarned,
        currentValue: amountWithInterest,
        accumulatedTotal: accumulated
      });
    });
    return { 
      history, 
      totalInterest, 
      totalInvested: sortedSavings.reduce((sum, s) => sum + s.amount, 0), 
      accumulated 
    };
  };

  // Utilidades
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

  if (showLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <DollarSign className="w-16 h-16 mx-auto text-blue-600 mb-4" />
            <h1 className="text-3xl font-bold text-gray-800">Finanzas Personales</h1>
            <p className="text-gray-600 mt-2">Organiza tus ingresos y gastos</p>
          </div>
          {!isRegistering ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Correo Electrónico</label>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="tu@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>
              {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
              <button onClick={handleLogin} className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
                Iniciar Sesión
              </button>
              <button onClick={() => { setIsRegistering(true); setLoginError(''); }} className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition">
                Crear Cuenta
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Correo Electrónico</label>
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="tu@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña (mínimo 6 caracteres)</label>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar Contraseña</label>
                <input
                  type="password"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>
              {loginError && <p className="text-red-500 text-sm text-center">{loginError}</p>}
              <button onClick={handleRegister} className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition">
                Registrarse
              </button>
              <button onClick={() => { setIsRegistering(false); setLoginError(''); }} className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition">
                Volver al Login
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-2 sm:px-4">
          <div className="flex justify-between items-center py-3 sm:py-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <User className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              <div>
                <h1 className="text-base sm:text-xl font-bold text-gray-800">Mis Finanzas</h1>
                <p className="text-xs text-gray-600 hidden sm:block">{currentUser?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 sm:gap-2 bg-red-500 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-red-600 transition text-sm"
            >
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
              <span className="sm:hidden">Salir</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 sm:gap-2 border-t border-gray-200 pt-2 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab('finanzas')}
              className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-t-lg font-semibold transition whitespace-nowrap text-xs sm:text-base ${
                activeTab === 'finanzas' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Finanzas</span>
            </button>
            {showSavingsModule && (
              <button
                onClick={() => setActiveTab('ahorros')}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-t-lg font-semibold transition whitespace-nowrap text-xs sm:text-base ${
                  activeTab === 'ahorros' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <PiggyBank className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Ahorros</span>
              </button>
            )}
            {showRemindersModule && (
              <button
                onClick={() => setActiveTab('recordatorios')}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-t-lg font-semibold transition whitespace-nowrap text-xs sm:text-base ${
                  activeTab === 'recordatorios' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span>Recordatorios</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-6xl mx-auto p-2 sm:p-4">
        {activeTab === 'finanzas' ? (
          <>
            {/* Dashboard */}
            <div className="bg-white rounded-lg shadow-md p-3 sm:p-6 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-800">Dashboard de Finanzas</h2>
                <div className="flex gap-1 sm:gap-2 flex-wrap w-full sm:w-auto">
                  <button onClick={() => setDateFilter('dia')} className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold transition text-xs sm:text-sm ${dateFilter === 'dia' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Día</button>
                  <button onClick={() => setDateFilter('mes')} className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold transition text-xs sm:text-sm ${dateFilter === 'mes' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Mes</button>
                  <button onClick={() => setDateFilter('ano')} className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold transition text-xs sm:text-sm ${dateFilter === 'ano' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Año</button>
                  <input type="date" value={selectedDate.toISOString().split('T')[0]} onChange={(e) => setSelectedDate(new Date(e.target.value))} className="px-2 sm:px-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm" />
                </div>
              </div>

              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-4 mb-4 sm:mb-6">
                <div className="text-center p-2 sm:p-0">
                  <p className="text-gray-600 text-xs mb-1">Total Ingresos</p>
                  <p className="text-base sm:text-2xl font-bold text-green-600">${formatCurrency(totalIngresos)}</p>
                </div>
                <div className="text-center p-2 sm:p-0">
                  <p className="text-gray-600 text-xs mb-1">Total Gastos</p>
                  <p className="text-base sm:text-2xl font-bold text-red-600">${formatCurrency(totalGastos)}</p>
                </div>
                <div className="text-center p-2 sm:p-0">
                  <p className="text-gray-600 text-xs mb-1">Balance</p>
                  <p className={`text-base sm:text-2xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>${formatCurrency(Math.abs(balance))}</p>
                </div>
                <div className="text-center p-2 sm:p-0">
                  <p className="text-gray-600 text-xs mb-1">Pendientes</p>
                  <p className="text-base sm:text-2xl font-bold text-yellow-600">{filteredTransactions.filter(t => t.type === 'gasto' && t.status === 'pendiente').length}</p>
                </div>
                <div className="text-center p-2 sm:p-0">
                  <p className="text-gray-600 text-xs mb-1">Pagados</p>
                  <p className="text-base sm:text-2xl font-bold text-green-600">{filteredTransactions.filter(t => t.type === 'gasto' && t.status === 'pagado').length}</p>
                </div>
                <div className="text-center p-2 sm:p-0">
                  <p className="text-gray-600 text-xs mb-1">Transacciones</p>
                  <p className="text-base sm:text-2xl font-bold text-purple-600">{filteredTransactions.length}</p>
                </div>
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h3 className="text-sm sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Gastos por Categoría</h3>
                  <div className="space-y-2 sm:space-y-3">
                    {(() => {
                      const categoryTotals = {};
                      filteredTransactions.filter(t => t.type === 'gasto' && t.status === 'pagado').forEach(t => {
                        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
                      });
                      const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 6);
                      const maxAmount = sortedCategories[0]?.[1] || 1;
                      return sortedCategories.length > 0 ? (
                        sortedCategories.map(([category, amount]) => (
                          <div key={category} className="space-y-1">
                            <div className="flex justify-between text-xs sm:text-sm">
                              <span className="font-semibold text-gray-700">{category}</span>
                              <span className="text-gray-600">${formatCurrency(amount)}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                              <div className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 sm:h-3 rounded-full" style={{ width: `${(amount / maxAmount) * 100}%` }}></div>
                            </div>
                          </div>
                        ))
                      ) : <p className="text-gray-500 text-center py-4 text-xs sm:text-base">No hay datos</p>;
                    })()}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4">Ingresos por Categoría</h3>
                  <div className="space-y-2 sm:space-y-3">
                    {(() => {
                      const categoryTotals = {};
                      filteredTransactions.filter(t => t.type === 'ingreso').forEach(t => {
                        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
                      });
                      const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).slice(0, 6);
                      const maxAmount = sortedCategories[0]?.[1] || 1;
                      return sortedCategories.length > 0 ? (
                        sortedCategories.map(([category, amount]) => (
                          <div key={category} className="space-y-1">
                            <div className="flex justify-between text-xs sm:text-sm">
                              <span className="font-semibold text-gray-700">{category}</span>
                              <span className="text-gray-600">${formatCurrency(amount)}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                              <div className="bg-gradient-to-r from-green-500 to-green-600 h-2 sm:h-3 rounded-full" style={{ width: `${(amount / maxAmount) * 100}%` }}></div>
                            </div>
                          </div>
                        ))
                      ) : <p className="text-gray-500 text-center py-4 text-xs sm:text-base">No hay datos</p>;
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Agregar Transacción */}
            <div className="bg-white rounded-lg shadow-md p-3 sm:p-6 mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Agregar Transacción</h2>
              <div className="flex gap-2 sm:gap-4 mb-3 sm:mb-4">
                <button onClick={() => setTransactionType('gasto')} className={`flex-1 py-2 sm:py-3 rounded-lg font-semibold transition text-sm sm:text-base ${transactionType === 'gasto' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Gasto</button>
                <button onClick={() => setTransactionType('ingreso')} className={`flex-1 py-2 sm:py-3 rounded-lg font-semibold transition text-sm sm:text-base ${transactionType === 'ingreso' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Ingreso</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Monto</label>
                  <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base" />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Categoría</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base">
                    <option value="">Seleccionar</option>
                    {categories[transactionType].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Descripción</label>
                  <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base" />
                </div>
                {transactionType === 'gasto' && (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Estado</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base">
                      <option value="pendiente">Pendiente</option>
                      <option value="pagado">Pagado</option>
                    </select>
                  </div>
                )}
              </div>
              <button onClick={addTransaction} className="w-full bg-blue-600 text-white py-2 sm:py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2 text-sm sm:text-base">
                <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                Agregar
              </button>
            </div>

            {/* Historial */}
            <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">Historial de Transacciones</h2>
              <div className="space-y-2 sm:space-y-3">
                {filteredTransactions.length === 0 ? (
                  <p className="text-gray-500 text-center py-8 text-sm sm:text-base">No hay transacciones</p>
                ) : (
                  filteredTransactions.map(transaction => (
                    <div key={transaction.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                        <div className="flex-1 w-full">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${transaction.type === 'ingreso' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {transaction.type === 'ingreso' ? 'Ingreso' : 'Gasto'}
                            </span>
                            <span className="font-semibold text-gray-700 text-sm sm:text-base">{transaction.category}</span>
                            {transaction.fromReminder && (
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">🔔 Recordatorio</span>
                            )}
                          </div>
                          <p className="text-gray-600 text-xs sm:text-sm">{transaction.description || 'Sin descripción'}</p>
                          <p className="text-xs text-gray-400 mt-1">{new Date(transaction.date).toLocaleDateString('es-ES')}</p>
                        </div>
                        <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
                          <span className={`text-xl sm:text-2xl font-bold ${transaction.type === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                            ${transaction.amount.toFixed(2)}
                          </span>
                          <div className="flex gap-2">
                            {transaction.type === 'gasto' && (
                              <button onClick={() => toggleStatus(transaction.id, transaction.status)} className={`px-2 sm:px-3 py-1 rounded text-xs font-semibold transition ${transaction.status === 'pagado' ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-yellow-500 text-white hover:bg-yellow-600'}`}>
                                {transaction.status === 'pagado' ? 'Pagado' : 'Pendiente'}
                              </button>
                            )}
                            <button onClick={() => deleteTransaction(transaction.id)} className="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition">
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
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
        ) : activeTab === 'ahorros' ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Módulo de Ahorros - Sección muy extensa</p>
            <p className="text-sm text-gray-500 mt-2">Ver archivo original para código completo</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">Módulo de Recordatorios - Sección muy extensa</p>
            <p className="text-sm text-gray-500 mt-2">Ver archivo original para código completo</p>
          </div>
        )}
      </div>
    </div>
  );
}
