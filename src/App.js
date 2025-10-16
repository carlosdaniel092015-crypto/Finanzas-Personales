import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, TrendingUp, TrendingDown, DollarSign, LogOut, User } from 'lucide-react';
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

  const categories = {
    gasto: ['Pasaje', 'Préstamos', 'Tarjetas', 'Alquiler', 'Comidas', 'Streaming'],
    ingreso: ['Ahorros', 'Salario', 'Quincena', 'Quincena + Incentivo', 'Otros']
  };

  // Escuchar cambios en autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setShowLogin(false);
      } else {
        setCurrentUser(null);
        setShowLogin(true);
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
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <User className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Mis Finanzas</h1>
              <p className="text-sm text-gray-600">Usuario: {currentUser?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-500 text-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Total Ingresos</p>
                <p className="text-3xl font-bold">${totalIngresos.toFixed(2)}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-green-200" />
            </div>
          </div>
          <div className="bg-red-500 text-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">Total Gastos</p>
                <p className="text-3xl font-bold">${totalGastos.toFixed(2)}</p>
              </div>
              <TrendingDown className="w-12 h-12 text-red-200" />
            </div>
          </div>
          <div className={`${balance >= 0 ? 'bg-blue-500' : 'bg-orange-500'} text-white rounded-lg shadow-lg p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Balance</p>
                <p className="text-3xl font-bold">${balance.toFixed(2)}</p>
              </div>
              <DollarSign className="w-12 h-12 text-blue-200" />
            </div>
          </div>
        </div>

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
      </div>
    </div>
  );
}
