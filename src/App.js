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
  onSnapshot 
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

  const AUTHORIZED_EMAILS = ['carlosdaniel092015@gmail.com', 'stephanymartinezjaquez30@gmail.com'];
  const ANNUAL_RETURN_RATE = 0.11;

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
      } else {
        setCurrentUser(null);
        setShowLogin(true);
        setShowSavingsModule(false);
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
      setActiveTab('finanzas');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
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
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <User className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-800">Mis Finanzas</h1>
                <p className="text-xs text-gray-600">{currentUser?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>

          {/* Tabs de navegación */}
          <div className="flex gap-2 border-t border-gray-200 pt-2">
            <button
              onClick={() => setActiveTab('finanzas')}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-semibold transition ${
                activeTab === 'finanzas'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Wallet className="w-5 h-5" />
              Finanzas
            </button>
            {showSavingsModule && (
              <button
                onClick={() => setActiveTab('ahorros')}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-semibold transition ${
                  activeTab === 'ahorros'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <PiggyBank className="w-5 h-5" />
                Ahorros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-6xl mx-auto p-4">
        {activeTab === 'finanzas' ? (
          <>
            {/* Dashboard de Finanzas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-500 text-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Total Ingresos</p>
                    <p className="text-3xl font-bold">${formatCurrency(totalIngresos)}</p>
                  </div>
                  <TrendingUp className="w-12 h-12 text-green-200" />
                </div>
              </div>
              <div className="bg-red-500 text-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm">Total Gastos</p>
                    <p className="text-3xl font-bold">${formatCurrency(totalGastos)}</p>
                  </div>
                  <TrendingDown className="w-12 h-12 text-red-200" />
                </div>
              </div>
              <div className={`${balance >= 0 ? 'bg-blue-500' : 'bg-orange-500'} text-white rounded-lg shadow-lg p-6`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Balance</p>
                    <p className="text-3xl font-bold">${formatCurrency(balance)}</p>
                  </div>
                  <DollarSign className="w-12 h-12 text-blue-200" />
                </div>
              </div>
            </div>

            {/* Dashboard Adicional de Finanzas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-yellow-500">
                <p className="text-gray-600 text-sm mb-1">Gastos Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">
                  ${formatCurrency(
                    filteredTransactions
                      .filter(t => t.type === 'gasto' && t.status === 'pendiente')
                      .reduce((sum, t) => sum + t.amount, 0)
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {filteredTransactions.filter(t => t.type === 'gasto' && t.status === 'pendiente').length} pendientes
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
                <p className="text-gray-600 text-sm mb-1">Gastos Pagados</p>
                <p className="text-2xl font-bold text-green-600">
                  ${formatCurrency(totalGastos)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {filteredTransactions.filter(t => t.type === 'gasto' && t.status === 'pagado').length} pagados
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
                <p className="text-gray-600 text-sm mb-1">Total Transacciones</p>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredTransactions.length}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {filteredTransactions.filter(t => t.type === 'ingreso').length} ingresos / {filteredTransactions.filter(t => t.type === 'gasto').length} gastos
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
                <p className="text-gray-600 text-sm mb-1">Promedio Diario</p>
                <p className="text-2xl font-bold text-purple-600">
                  ${formatCurrency(
                    dateFilter === 'mes' ? totalGastos / 30 :
                    dateFilter === 'ano' ? totalGastos / 365 :
                    totalGastos
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-1">Gasto promedio</p>
              </div>
            </div>

            {/* Gráfico de categorías más gastadas */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Top 5 Categorías de Gastos</h3>
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
                    .slice(0, 5);

                  const maxAmount = sortedCategories[0]?.[1] || 1;

                  return sortedCategories.length > 0 ? (
                    sortedCategories.map(([category, amount]) => (
                      <div key={category} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold text-gray-700">{category}</span>
                          <span className="text-gray-600">${formatCurrency(amount)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full"
                            style={{ width: `${(amount / maxAmount) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">No hay datos de gastos</p>
                  );
                })()}
              </div>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Filtrar por Período</h2>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setDateFilter('dia')}
                  className={`px-6 py-2 rounded-lg font-semibold transition ${
                    dateFilter === 'dia' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Día
                </button>
                <button
                  onClick={() => setDateFilter('mes')}
                  className={`px-6 py-2 rounded-lg font-semibold transition ${
                    dateFilter === 'mes' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Mes
                </button>
                <button
                  onClick={() => setDateFilter('ano')}
                  className={`px-6 py-2 rounded-lg font-semibold transition ${
                    dateFilter === 'ano' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Año
                </button>
                <input
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
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
        ) : (
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
        )}
      </div>
    </div>
  );
}
