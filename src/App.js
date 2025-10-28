import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, TrendingUp, TrendingDown, DollarSign, LogOut, User, Wallet, PiggyBank } from 'lucide-react';
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
  const [currentUser, setCurrentUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ email: '', password: '', confirmPassword: '' });
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [transactions, setTransactions] = useState([]);
  const [transactionType, setTransactionType] = useState('gasto');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('pendiente');
  const [dateFilter, setDateFilter] = useState('mes');
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Estados para el módulo de ahorro
  const [savings, setSavings] = useState([]);
  const [savingName, setSavingName] = useState('');
  const [savingAmount, setSavingAmount] = useState('');
  const [savingDate, setSavingDate] = useState(new Date().toISOString().split('T')[0]);
  const [showSavingsModule, setShowSavingsModule] = useState(false);
  const [activeTab, setActiveTab] = useState('finanzas');

  // Estados para el módulo de recordatorios
  const [reminders, setReminders] = useState([]);
  const [reminderName, setReminderName] = useState('');
  const [reminderAmount, setReminderAmount] = useState('');
  const [reminderDueDate, setReminderDueDate] = useState('');
  const [reminderCategory, setReminderCategory] = useState('');
  const [reminderFrequency, setReminderFrequency] = useState('unica');
  const [showRemindersModule, setShowRemindersModule] = useState(false);
  const [reminderFilter, setReminderFilter] = useState('todos');

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

  // Escuchar cambios en ahorros (datos compartidos)
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

  // Crear transacciones automáticas para recordatorios al vencer
  useEffect(() => {
    if (!currentUser || !showRemindersModule || reminders.length === 0) return;

    const checkAndCreateTransactions = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const reminder of reminders) {
        const dueDate = new Date(reminder.dueDate);
        dueDate.setHours(0, 0, 0, 0);

        // Si la fecha de vencimiento es hoy y está pendiente
        if (dueDate.getTime() === today.getTime() && reminder.status === 'pendiente') {
          try {
            // Verificar si ya existe una transacción para este recordatorio en esta fecha
            const transactionsQuery = query(
              collection(db, 'transactions'),
              where('userId', '==', currentUser.uid),
              where('reminderId', '==', reminder.id),
              where('date', '>=', today.toISOString().split('T')[0]),
              where('date', '<=', today.toISOString())
            );
            
            const existingTransactions = await getDocs(transactionsQuery);
            
            if (existingTransactions.empty) {
              // Crear transacción automática
              await addDoc(collection(db, 'transactions'), {
                userId: currentUser.uid,
                type: 'gasto',
                amount: reminder.amount,
                category: reminder.category,
                description: `${reminder.name} (Recordatorio automático)`,
                status: 'pendiente',
                date: today.toISOString(),
                createdAt: new Date(),
                fromReminder: true,
                reminderId: reminder.id,
                autoCreated: true
              });

              // Si es mensual, actualizar la fecha al próximo mes
              if (reminder.frequency === 'mensual') {
                const nextMonth = new Date(dueDate);
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                
                await updateDoc(doc(db, 'reminders', reminder.id), {
                  dueDate: nextMonth.toISOString().split('T')[0]
                });
              } else if (reminder.frequency === 'quincenal') {
                const nextDate = new Date(dueDate);
                nextDate.setDate(nextDate.getDate() + 15);
                
                await updateDoc(doc(db, 'reminders', reminder.id), {
                  dueDate: nextDate.toISOString().split('T')[0]
                });
              } else if (reminder.frequency === 'anual') {
                const nextYear = new Date(dueDate);
                nextYear.setFullYear(nextYear.getFullYear() + 1);
                
                await updateDoc(doc(db, 'reminders', reminder.id), {
                  dueDate: nextYear.toISOString().split('T')[0]
                });
              }
            }
          } catch (error) {
            console.error('Error al crear transacción automática:', error);
          }
        }
      }
    };

    // Ejecutar al cargar y cada hora
    checkAndCreateTransactions();
    const interval = setInterval(checkAndCreateTransactions, 3600000); // cada hora

    return () => clearInterval(interval);
  }, [currentUser, showRemindersModule, reminders]);

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
        setLoginError('Error al registrarse. Intenta nuevamente.');
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
      alert('Error al agregar el recordatorio: ' + error.message);
    }
  };

  const deleteReminder = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este recordatorio? Esto también eliminará las transacciones relacionadas.')) {
      return;
    }

    try {
      // Eliminar el recordatorio
      await deleteDoc(doc(db, 'reminders', id));
      
      // Eliminar transacciones relacionadas
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
      alert('Error al eliminar el recordatorio');
    }
  };

  const toggleReminderStatus = async (id, currentStatus, reminder) => {
    try {
      const newStatus = currentStatus === 'pagado' ? 'pendiente' : 'pagado';
      
      await updateDoc(doc(db, 'reminders', id), {
        status: newStatus,
        paidDate: newStatus === 'pagado' ? new Date().toISOString() : null
      });

      // Si se marca como pagado, crear transacción en finanzas
      if (newStatus === 'pagado') {
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
        alert('Pago registrado y agregado a tus finanzas');
      } else {
        // Si se desmarca como pagado, eliminar la transacción relacionada
        const q = query(
          collection(db, 'transactions'),
          where('userId', '==', currentUser.uid),
          where('reminderId', '==', id)
        );
        const snapshot = await onSnapshot(q, async (querySnapshot) => {
          querySnapshot.forEach(async (docSnapshot) => {
            await deleteDoc(doc(db, 'transactions', docSnapshot.id));
          });
        });
      }
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      alert('Error al actualizar el estado');
    }
  };

  const handleReminderAmountInput = (value) => {
    const cleaned = value.replace(/[^\d.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return;
    }
    
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
      console.error('Error al agregar transacción:', error);
      alert('Error al agregar la transacción');
    }
  };

  const deleteTransaction = async (id) => {
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (error) {
      console.error('Error al eliminar transacción:', error);
      alert('Error al eliminar la transacción');
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      await updateDoc(doc(db, 'transactions', id), {
        status: currentStatus === 'pagado' ? 'pendiente' : 'pagado'
      });
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      alert('Error al actualizar el estado');
    }
  };

  const addSaving = async () => {
    if (!savingAmount || !savingName) {
      alert('Por favor completa el nombre y el monto');
      return;
    }

    // Limpiar el monto y convertir a número
    const cleanAmount = savingAmount.replace(/,/g, '').replace(/[^\d.]/g, '');
    const numericAmount = parseFloat(cleanAmount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert('Por favor ingresa un monto válido mayor a 0');
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
      alert('Ahorro agregado exitosamente');
    } catch (error) {
      console.error('Error al agregar ahorro:', error);
      alert('Error al agregar el ahorro: ' + error.message);
    }
  };

  const deleteSaving = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este ahorro?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'savings', id));
    } catch (error) {
      console.error('Error al eliminar ahorro:', error);
      alert('Error al eliminar el ahorro');
    }
  };

  const calculateCompoundInterest = () => {
    const sortedSavings = [...savings].sort((a, b) => new Date(a.date) - new Date(b.date));
    let history = [];
    let accumulated = 0;
    let totalInterest = 0;

    sortedSavings.forEach((saving, index) => {
      const savingDate = new Date(saving.date);
      const today = new Date();
      const daysElapsed = Math.max(0, Math.floor((today - savingDate) / (1000 * 60 * 60 * 24)));
      const yearsElapsed = daysElapsed / 365;

      // Calcular interés compuesto diario
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
    // Remover todo excepto números y punto decimal
    const cleaned = value.replace(/[^\d.]/g, '');
    
    // Limitar a un solo punto decimal
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Formatear solo la parte entera con comas
    let formatted = parts[0];
    if (formatted) {
      // Agregar comas cada 3 dígitos
      formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    
    // Si hay decimales, agregarlos
    if (parts.length === 2) {
      formatted = formatted + '.' + parts[1].slice(0, 2); // Limitar a 2 decimales
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
              {loginError && (
                <p className="text-red-500 text-sm text-center">{loginError}</p>
              )}
              <button
                onClick={handleLogin}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Iniciar Sesión
              </button>
              <button
                onClick={() => {
                  setIsRegistering(true);
                  setLoginError('');
                }}
                className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="tu@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña (mínimo 6 caracteres)</label>
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar Contraseña</label>
                <input
                  type="password"
                  value={registerForm.confirmPassword}
                  onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
              {loginError && (
                <p className="text-red-500 text-sm text-center">{loginError}</p>
              )}
              <button
                onClick={handleRegister}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Registrarse
              </button>
              <button
                onClick={() => {
                  setIsRegistering(false);
                  setLoginError('');
                }}
                className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
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
              className="flex items-center gap-1 sm:gap-2 bg-red-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-red-600 transition text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>

          {/* Tabs de navegación */}
          <div className="flex gap-1 sm:gap-2 border-t border-gray-200 pt-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveTab('finanzas')}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-t-lg font-semibold transition whitespace-nowrap text-xs sm:text-base ${
                activeTab === 'finanzas'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">Finanzas</span>
            </button>
            {showSavingsModule && (
              <button
                onClick={() => setActiveTab('ahorros')}
                className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-t-lg font-semibold transition whitespace-nowrap text-xs sm:text-base ${
                  activeTab === 'ahorros'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <PiggyBank className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Ahorros</span>
              </button>
            )}
            {showRemindersModule && (
              <button
                onClick={() => setActiveTab('recordatorios')}
                className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-t-lg font-semibold transition whitespace-nowrap text-xs sm:text-base ${
                  activeTab === 'recordatorios'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="hidden sm:inline">Recordatorios</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-6xl mx-auto p-2 sm:p-4">
        {activeTab === 'finanzas' ? (
          <>
            {/* Dashboard de Finanzas Integrado */}
            <div className="bg-white rounded-lg shadow-md p-3 sm:p-6 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Dashboard de Finanzas</h2>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setDateFilter('dia')}
                    className={`px-3 sm:px-4 py-2 rounded-lg font-semibold transition text-xs sm:text-sm ${
                      dateFilter === 'dia' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Día
                  </button>
                  <button
                    onClick={() => setDateFilter('mes')}
                    className={`px-3 sm:px-4 py-2 rounded-lg font-semibold transition text-xs sm:text-sm ${
                      dateFilter === 'mes' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Mes
                  </button>
                  <button
                    onClick={() => setDateFilter('ano')}
                    className={`px-3 sm:px-4 py-2 rounded-lg font-semibold transition text-xs sm:text-sm ${
                      dateFilter === 'ano' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Año
                  </button>
                  <input
                    type="date"
                    value={selectedDate.toISOString().split('T')[0]}
                    onChange={(e) => setSelectedDate(new Date(e.target.value))}
                    className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm flex-1 sm:flex-none"
                  />
                </div>
              </div>

              {/* KPIs principales */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-4 mb-4 sm:mb-6">
                <div className="text-center">
                  <p className="text-gray-600 text-xs mb-1">Total Ingresos</p>
                  <p className="text-lg sm:text-2xl font-bold text-green-600">${formatCurrency(totalIngresos)}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600 text-xs mb-1">Total Gastos</p>
                  <p className="text-lg sm:text-2xl font-bold text-red-600">${formatCurrency(totalGastos)}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600 text-xs mb-1">Balance</p>
                  <p className={`text-lg sm:text-2xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                    ${formatCurrency(Math.abs(balance))}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600 text-xs mb-1">Pendientes</p>
                  <p className="text-lg sm:text-2xl font-bold text-yellow-600">
                    {filteredTransactions.filter(t => t.type === 'gasto' && t.status === 'pendiente').length}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600 text-xs mb-1">Pagados</p>
                  <p className="text-lg sm:text-2xl font-bold text-green-600">
                    {filteredTransactions.filter(t => t.type === 'gasto' && t.status === 'pagado').length}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600 text-xs mb-1">Transacciones</p>
                  <p className="text-lg sm:text-2xl font-bold text-purple-600">{filteredTransactions.length}</p>
                </div>
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Gráfico de categorías de gastos */}
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

                {/* Gráfico de ingresos por categoría */}
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

            {/* Agregar Transacción */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Agregar Transacción</h2>
              
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => setTransactionType('gasto')}
                  className={`flex-1 py-3 rounded-lg font-semibold transition ${
                    transactionType === 'gasto' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Gasto
                </button>
                <button
                  onClick={() => setTransactionType('ingreso')}
                  className={`flex-1 py-3 rounded-lg font-semibold transition ${
                    transactionType === 'ingreso' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Ingreso
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monto</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar</option>
                    {categories[transactionType].map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Opcional"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {transactionType === 'gasto' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="pagado">Pagado</option>
                    </select>
                  </div>
                )}
              </div>

              <button
                onClick={addTransaction}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-5 h-5" />
                Agregar
              </button>
            </div>

            {/* Historial de Transacciones */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Historial de Transacciones</h2>
              <div className="space-y-3">
                {filteredTransactions.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No hay transacciones registradas</p>
                ) : (
                  filteredTransactions.map(transaction => (
                    <div
                      key={transaction.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              transaction.type === 'ingreso' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {transaction.type === 'ingreso' ? 'Ingreso' : 'Gasto'}
                            </span>
                            <span className="font-semibold text-gray-700">{transaction.category}</span>
                          </div>
                          <p className="text-gray-600 text-sm">{transaction.description || 'Sin descripción'}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(transaction.date).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2 ml-4">
                          <span className={`text-2xl font-bold ${
                            transaction.type === 'ingreso' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            ${transaction.amount.toFixed(2)}
                          </span>
                          <div className="flex gap-2">
                            {transaction.type === 'gasto' && (
                              <button
                                onClick={() => toggleStatus(transaction.id, transaction.status)}
                                className={`px-3 py-1 rounded text-xs font-semibold transition ${
                                  transaction.status === 'pagado'
                                    ? 'bg-green-500 text-white hover:bg-green-600'
                                    : 'bg-yellow-500 text-white hover:bg-yellow-600'
                                }`}
                              >
                                {transaction.status === 'pagado' ? 'Pagado' : 'Pendiente'}
                              </button>
                            )}
                            <button
                              onClick={() => deleteTransaction(transaction.id)}
                              className="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition"
                            >
                              <Trash2 className="w-4 h-4" />
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
          <>
            {/* Módulo de Ahorros */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg shadow-lg p-6 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <PiggyBank className="w-10 h-10" />
                <div>
                  <h2 className="text-2xl font-bold">Cuenta de Inversión</h2>
                  <p className="text-purple-100">Retorno anual: 11% | Interés compuesto diario</p>
                </div>
              </div>
            </div>

            {/* Dashboard de Inversión */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {(() => {
                const { totalInvested, totalInterest, accumulated } = calculateCompoundInterest();
                return (
                  <>
                    <div className="bg-blue-500 text-white rounded-lg shadow-lg p-6">
                      <p className="text-blue-100 text-sm">Total Invertido</p>
                      <p className="text-3xl font-bold">${formatCurrency(totalInvested)}</p>
                    </div>
                    <div className="bg-green-500 text-white rounded-lg shadow-lg p-6">
                      <p className="text-green-100 text-sm">Intereses Ganados</p>
                      <p className="text-3xl font-bold">${formatCurrency(totalInterest)}</p>
                      <p className="text-green-100 text-xs mt-1">
                        +{totalInvested > 0 ? ((totalInterest / totalInvested) * 100).toFixed(2) : 0}%
                      </p>
                    </div>
                    <div className="bg-purple-500 text-white rounded-lg shadow-lg p-6">
                      <p className="text-purple-100 text-sm">Valor Total Actual</p>
                      <p className="text-3xl font-bold">${formatCurrency(accumulated)}</p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Dashboard Adicional de Ahorros */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {(() => {
                const { history } = calculateCompoundInterest();
                const totalSavings = savings.length;
                const avgSaving = totalSavings > 0 ? savings.reduce((sum, s) => sum + s.amount, 0) / totalSavings : 0;
                const oldestSaving = history.length > 0 ? history[0] : null;
                const newestSaving = history.length > 0 ? history[history.length - 1] : null;
                
                // Calcular proyección a 1 año
                const { totalInvested } = calculateCompoundInterest();
                const dailyRate = Math.pow(1 + ANNUAL_RETURN_RATE, 1/365) - 1;
                const projectedIn1Year = totalInvested * Math.pow(1 + dailyRate, 365);
                const projectedInterest = projectedIn1Year - totalInvested;

                return (
                  <>
                    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-indigo-500">
                      <p className="text-gray-600 text-sm mb-1">Total de Ahorros</p>
                      <p className="text-2xl font-bold text-indigo-600">{totalSavings}</p>
                      <p className="text-xs text-gray-500 mt-1">Depósitos realizados</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-cyan-500">
                      <p className="text-gray-600 text-sm mb-1">Ahorro Promedio</p>
                      <p className="text-2xl font-bold text-cyan-600">${formatCurrency(avgSaving)}</p>
                      <p className="text-xs text-gray-500 mt-1">Por depósito</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-emerald-500">
                      <p className="text-gray-600 text-sm mb-1">Ahorro Más Antiguo</p>
                      <p className="text-2xl font-bold text-emerald-600">
                        {oldestSaving ? `${oldestSaving.daysElapsed} días` : '0'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {oldestSaving ? `+${formatCurrency(oldestSaving.interestEarned)}` : 'N/A'}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-pink-500">
                      <p className="text-gray-600 text-sm mb-1">Proyección 1 Año</p>
                      <p className="text-2xl font-bold text-pink-600">${formatCurrency(projectedIn1Year)}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        +${formatCurrency(projectedInterest)} interés
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Gráfico de rendimiento por ahorro */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Rendimiento por Ahorro (Top 5)</h3>
              <div className="space-y-3">
                {(() => {
                  const { history } = calculateCompoundInterest();
                  const topSavings = [...history]
                    .sort((a, b) => b.interestEarned - a.interestEarned)
                    .slice(0, 5);

                  const maxInterest = topSavings[0]?.interestEarned || 1;

                  return topSavings.length > 0 ? (
                    topSavings.map((saving) => (
                      <div key={saving.id} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold text-gray-700">{saving.name}</span>
                          <div className="text-right">
                            <span className="text-green-600 font-bold">+${formatCurrency(saving.interestEarned)}</span>
                            <span className="text-gray-500 text-xs ml-2">
                              ({((saving.interestEarned / saving.amount) * 100).toFixed(2)}%)
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full"
                            style={{ width: `${(saving.interestEarned / maxInterest) * 100}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{saving.daysElapsed} días</span>
                          <span>Capital: ${formatCurrency(saving.amount)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No hay datos de ahorros</p>
                  );
                })()}
              </div>
            </div>

            {/* Estadísticas de crecimiento */}
            <div className="bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">📈 Análisis de Crecimiento</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(() => {
                  const { totalInvested, totalInterest, accumulated } = calculateCompoundInterest();
                  const dailyRate = Math.pow(1 + ANNUAL_RETURN_RATE, 1/365) - 1;
                  
                  // Proyecciones
                  const in6Months = totalInvested * Math.pow(1 + dailyRate, 180);
                  const in1Year = totalInvested * Math.pow(1 + dailyRate, 365);
                  const in2Years = totalInvested * Math.pow(1 + dailyRate, 730);

                  return (
                    <>
                      <div className="bg-white rounded-lg p-4">
                        <p className="text-gray-600 text-sm mb-2">En 6 meses</p>
                        <p className="text-xl font-bold text-purple-600">${formatCurrency(in6Months)}</p>
                        <p className="text-xs text-green-600">+${formatCurrency(in6Months - totalInvested)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <p className="text-gray-600 text-sm mb-2">En 1 año</p>
                        <p className="text-xl font-bold text-indigo-600">${formatCurrency(in1Year)}</p>
                        <p className="text-xs text-green-600">+${formatCurrency(in1Year - totalInvested)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4">
                        <p className="text-gray-600 text-sm mb-2">En 2 años</p>
                        <p className="text-xl font-bold text-blue-600">${formatCurrency(in2Years)}</p>
                        <p className="text-xs text-green-600">+${formatCurrency(in2Years - totalInvested)}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Agregar Ahorro */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Agregar Ahorro</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Ahorro</label>
                  <input
                    type="text"
                    value={savingName}
                    onChange={(e) => setSavingName(e.target.value)}
                    placeholder="Ej: Ahorro mensual enero"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cantidad</label>
                  <input
                    type="text"
                    value={savingAmount}
                    onChange={(e) => handleAmountInput(e.target.value)}
                    placeholder="5,000.00"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
                  <input
                    type="date"
                    value={savingDate}
                    onChange={(e) => setSavingDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <button
                onClick={addSaving}
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-5 h-5" />
                Agregar Ahorro
              </button>
            </div>

            {/* Historial de Ahorros */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Historial de Ahorros e Intereses</h2>
              <div className="space-y-3">
                {savings.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No hay ahorros registrados</p>
                ) : (
                  calculateCompoundInterest().history.map((saving) => (
                    <div
                      key={saving.id}
                      className="border-2 border-purple-200 rounded-lg p-4 hover:shadow-lg transition bg-gradient-to-r from-purple-50 to-indigo-50"
                    >
                      <div className="flex justify-between items-start flex-wrap gap-4">
                        <div className="flex-1 min-w-[250px]">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="font-bold text-lg text-gray-800">{saving.name}</span>
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">
                              {new Date(saving.date).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                            <div className="bg-white rounded-lg p-3 border border-purple-100">
                              <p className="text-xs text-gray-500 mb-1">Monto Invertido</p>
                              <p className="text-lg font-bold text-blue-600">${formatCurrency(saving.amount)}</p>
                            </div>
                            
                            <div className="bg-white rounded-lg p-3 border border-green-100">
                              <p className="text-xs text-gray-500 mb-1">Intereses Ganados</p>
                              <p className="text-lg font-bold text-green-600">+${formatCurrency(saving.interestEarned)}</p>
                            </div>
                            
                            <div className="bg-white rounded-lg p-3 border border-purple-100">
                              <p className="text-xs text-gray-500 mb-1">Valor Actual</p>
                              <p className="text-lg font-bold text-purple-600">${formatCurrency(saving.currentValue)}</p>
                            </div>
                            
                            <div className="bg-white rounded-lg p-3 border border-indigo-100">
                              <p className="text-xs text-gray-500 mb-1">Rendimiento</p>
                              <p className="text-lg font-bold text-indigo-600">
                                +{((saving.interestEarned / saving.amount) * 100).toFixed(2)}%
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-semibold">Días transcurridos:</span> {saving.daysElapsed}
                            </div>
                            <div>
                              <span className="font-semibold">Años:</span> {saving.yearsElapsed}
                            </div>
                          </div>
                          
                          <p className="text-xs text-gray-400 mt-2">
                            Agregado por: <span className="font-semibold">{saving.addedBy}</span>
                          </p>
                        </div>
                        
                        <div className="flex flex-col items-end gap-3">
                          <div className="text-right bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg p-3 border-2 border-purple-200">
                            <p className="text-xs text-purple-600 font-semibold mb-1">Acumulado Total</p>
                            <p className="text-2xl font-bold text-purple-700">
                              ${formatCurrency(saving.accumulatedTotal)}
                            </p>
                          </div>
                          <button
                            onClick={() => deleteSaving(saving.id)}
                            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="text-sm font-semibold">Eliminar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Módulo de Recordatorios */}
            <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg shadow-lg p-6 mb-6">
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <div>
                  <h2 className="text-2xl font-bold">Recordatorios de Pagos</h2>
                  <p className="text-orange-100">Préstamos, Tarjetas y Servicios</p>
                </div>
              </div>
            </div>

            {/* Dashboard de Recordatorios */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {(() => {
                const totalReminders = reminders.length;
                const pendingReminders = reminders.filter(r => r.status === 'pendiente');
                const paidReminders = reminders.filter(r => r.status === 'pagado');
                const totalPending = pendingReminders.reduce((sum, r) => sum + r.amount, 0);
                const overdueReminders = pendingReminders.filter(r => getDaysUntilDue(r.dueDate) < 0);
                const dueSoonReminders = pendingReminders.filter(r => {
                  const days = getDaysUntilDue(r.dueDate);
                  return days >= 0 && days <= 7;
                });

                return (
                  <>
                    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-orange-500">
                      <p className="text-gray-600 text-sm mb-1">Total Recordatorios</p>
                      <p className="text-2xl font-bold text-orange-600">{totalReminders}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {pendingReminders.length} pendientes
                      </p>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-red-500">
                      <p className="text-gray-600 text-sm mb-1">Monto Pendiente</p>
                      <p className="text-2xl font-bold text-red-600">${formatCurrency(totalPending)}</p>
                      <p className="text-xs text-gray-500 mt-1">Por pagar</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-yellow-500">
                      <p className="text-gray-600 text-sm mb-1">Vencen Pronto</p>
                      <p className="text-2xl font-bold text-yellow-600">{dueSoonReminders.length}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        ${formatCurrency(dueSoonReminders.reduce((sum, r) => sum + r.amount, 0))}
                      </p>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
                      <p className="text-gray-600 text-sm mb-1">Vencidos</p>
                      <p className="text-2xl font-bold text-purple-600">{overdueReminders.length}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        ${formatCurrency(overdueReminders.reduce((sum, r) => sum + r.amount, 0))}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Dashboard por Categoría */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Recordatorios por Categoría</h3>
              <div className="space-y-3">
                {(() => {
                  const categoryTotals = {};
                  const categoryCounts = {};
                  
                  reminders.filter(r => r.status === 'pendiente').forEach(r => {
                    categoryTotals[r.category] = (categoryTotals[r.category] || 0) + r.amount;
                    categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
                  });
                  
                  const sortedCategories = Object.entries(categoryTotals)
                    .sort((a, b) => b[1] - a[1]);

                  const maxAmount = sortedCategories[0]?.[1] || 1;

                  return sortedCategories.length > 0 ? (
                    sortedCategories.map(([category, amount]) => (
                      <div key={category} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-700">{category}</span>
                            <span className="text-xs text-gray-500">({categoryCounts[category]} recordatorios)</span>
                          </div>
                          <span className="text-gray-600 font-bold">${formatCurrency(amount)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className="bg-gradient-to-r from-orange-500 to-red-600 h-3 rounded-full transition-all"
                            style={{ width: `${(amount / maxAmount) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No hay recordatorios pendientes</p>
                  );
                })()}
              </div>
            </div>

            {/* Agregar Recordatorio */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Agregar Recordatorio</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                  <input
                    type="text"
                    value={reminderName}
                    onChange={(e) => setReminderName(e.target.value)}
                    placeholder="Ej: Pago tarjeta Visa"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monto</label>
                  <input
                    type="text"
                    value={reminderAmount}
                    onChange={(e) => handleReminderAmountInput(e.target.value)}
                    placeholder="5,000.00"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Vencimiento</label>
                  <input
                    type="date"
                    value={reminderDueDate}
                    onChange={(e) => setReminderDueDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
                  <select
                    value={reminderCategory}
                    onChange={(e) => setReminderCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Seleccionar</option>
                    {reminderCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Frecuencia</label>
                  <select
                    value={reminderFrequency}
                    onChange={(e) => setReminderFrequency(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="unica">Única vez</option>
                    <option value="mensual">Mensual</option>
                    <option value="quincenal">Quincenal</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
              </div>
              <button
                onClick={addReminder}
                className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition flex items-center justify-center gap-2"
              >
                <PlusCircle className="w-5 h-5" />
                Agregar Recordatorio
              </button>
            </div>

            {/* Lista de Recordatorios */}
            <div className="bg-white rounded-lg shadow-md p-3 sm:p-6">
              <div className="flex flex-col gap-3 mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">Mis Recordatorios</h2>
                <div className="flex gap-1 sm:gap-2 flex-wrap">
                  <button
                    onClick={() => setReminderFilter('todos')}
                    className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold transition text-xs sm:text-sm ${
                      reminderFilter === 'todos' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Todos ({reminders.length})
                  </button>
                  <button
                    onClick={() => setReminderFilter('pendientes')}
                    className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold transition text-xs sm:text-sm ${
                      reminderFilter === 'pendientes' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <span className="hidden sm:inline">Pendientes</span>
                    <span className="sm:hidden">Pend.</span> ({reminders.filter(r => r.status === 'pendiente' && getDaysUntilDue(r.dueDate) > 7).length})
                  </button>
                  <button
                    onClick={() => setReminderFilter('pronto')}
                    className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold transition text-xs sm:text-sm ${
                      reminderFilter === 'pronto' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Pronto ({reminders.filter(r => {
                      const days = getDaysUntilDue(r.dueDate);
                      return r.status === 'pendiente' && days >= 0 && days <= 7;
                    }).length})
                  </button>
                  <button
                    onClick={() => setReminderFilter('vencidos')}
                    className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold transition text-xs sm:text-sm ${
                      reminderFilter === 'vencidos' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <span className="hidden sm:inline">Vencidos</span>
                    <span className="sm:hidden">Venc.</span> ({reminders.filter(r => r.status === 'pendiente' && getDaysUntilDue(r.dueDate) < 0).length})
                  </button>
                  <button
                    onClick={() => setReminderFilter('pagados')}
                    className={`px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg font-semibold transition text-xs sm:text-sm ${
                      reminderFilter === 'pagados' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <span className="hidden sm:inline">Pagados</span>
                    <span className="sm:hidden">Pag.</span> ({reminders.filter(r => r.status === 'pagado').length})
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {filterReminders().length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No hay recordatorios en esta categoría</p>
                ) : (
                  filterReminders().map((reminder) => {
                    const daysUntil = getDaysUntilDue(reminder.dueDate);
                    const isOverdue = daysUntil < 0;
                    const isDueSoon = daysUntil >= 0 && daysUntil <= 7;
                    
                    return (
                      <div
                        key={reminder.id}
                        className={`border-2 rounded-lg p-4 hover:shadow-lg transition ${
                          reminder.status === 'pagado' 
                            ? 'border-green-200 bg-green-50' 
                            : isOverdue 
                            ? 'border-red-300 bg-red-50'
                            : isDueSoon
                            ? 'border-yellow-300 bg-yellow-50'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex justify-between items-start flex-wrap gap-4">
                          <div className="flex-1 min-w-[250px]">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-bold text-lg text-gray-800">{reminder.name}</span>
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                reminder.status === 'pagado'
                                  ? 'bg-green-100 text-green-800'
                                  : isOverdue
                                  ? 'bg-red-100 text-red-800'
                                  : isDueSoon
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {reminder.status === 'pagado' 
                                  ? 'Pagado' 
                                  : isOverdue 
                                  ? `Vencido (${Math.abs(daysUntil)} días)`
                                  : isDueSoon
                                  ? `Vence en ${daysUntil} días`
                                  : `Faltan ${daysUntil} días`
                                }
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-sm mb-2">
                              <div>
                                <span className="text-gray-600">Categoría:</span>
                                <span className="font-semibold ml-2">{reminder.category}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Frecuencia:</span>
                                <span className="font-semibold ml-2 capitalize">{reminder.frequency}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">Vencimiento:</span>
                                <span className="font-semibold ml-2">
                                  {new Date(reminder.dueDate).toLocaleDateString('es-ES')}
                                </span>
                              </div>
                              {reminder.status === 'pagado' && reminder.paidDate && (
                                <div>
                                  <span className="text-gray-600">Pagado:</span>
                                  <span className="font-semibold ml-2 text-green-600">
                                    {new Date(reminder.paidDate).toLocaleDateString('es-ES')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            <p className="text-2xl font-bold text-orange-600">
                              ${formatCurrency(reminder.amount)}
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => toggleReminderStatus(reminder.id, reminder.status, reminder)}
                                className={`px-4 py-2 rounded-lg font-semibold transition ${
                                  reminder.status === 'pagado'
                                    ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                                    : 'bg-green-500 text-white hover:bg-green-600'
                                }`}
                              >
                                {reminder.status === 'pagado' ? 'Marcar Pendiente' : 'Marcar Pagado'}
                              </button>
                              <button
                                onClick={() => deleteReminder(reminder.id)}
                                className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition"
                              >
                                <Trash2 className="w-5 h-5" />
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
}
