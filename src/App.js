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



  const [savings, setSavings] = useState([]);

  const [savingName, setSavingName] = useState('');

  const [savingAmount, setSavingAmount] = useState('');

  const [savingDate, setSavingDate] = useState(new Date().toISOString().split('T')[0]);

  const [showSavingsModule, setShowSavingsModule] = useState(false);

  const [activeTab, setActiveTab] = useState('finanzas');



  const [reminders, setReminders] = useState([]);

  const [reminderName, setReminderName] = useState('');

  const [reminderAmount, setReminderAmount] = useState('');

  const [reminderDueDate, setReminderDueDate] = useState('');

  const [reminderCategory, setReminderCategory] = useState('');

  const [reminderFrequency, setReminderFrequency] = useState('unica');

  const [showRemindersModule, setShowRemindersModule] = useState(false);

  const [reminderFilter, setReminderFilter] = useState('todos');
  const [reminderDateFilter, setReminderDateFilter] = useState('mes');
  const [reminderSelectedDate, setReminderSelectedDate] = useState(new Date());

  // Estados para el módulo de negocios
const [activeBusinessTab, setActiveBusinessTab] = useState('dashboard');
const [businessTransactions, setBusinessTransactions] = useState([]);
const [businessType, setBusinessType] = useState('ingreso');
const [businessAmount, setBusinessAmount] = useState('');
const [businessConcept, setBusinessConcept] = useState('');
const [businessPaymentMethod, setBusinessPaymentMethod] = useState('');
const [businessStatus, setBusinessStatus] = useState('pagado');
const [businessDateFilter, setBusinessDateFilter] = useState('mes');
const [businessSelectedDate, setBusinessSelectedDate] = useState(new Date());
const [businessSearchTerm, setBusinessSearchTerm] = useState('');
const [showBusinessModule, setShowBusinessModule] = useState(false);

const BUSINESS_AUTHORIZED_EMAIL = 'carlosdaniel092015@gmail.com';

const paymentMethods = ['Efectivo', 'Tarjeta', 'Transferencia', 'Cheque', 'QR/Digital', 'Crédito'];

  const AUTHORIZED_EMAILS = ['carlosdaniel092015@gmail.com', 'stephanymartinezjaquez30@gmail.com'];

  const REMINDERS_AUTHORIZED_EMAIL = 'carlosdaniel092015@gmail.com';

  const ANNUAL_RETURN_RATE = 0.11;



  const reminderCategories = ['Préstamos', 'Tarjetas de Crédito', 'Agua', 'Luz', 'Internet', 'Teléfono', 'Cable/TV', 'Streaming', 'Alquiler', 'Seguro', 'Otros'];



  const categories = {

    gasto: ['Pasaje', 'Préstamos', 'Tarjetas', 'Alquiler', 'Comidas', 'Streaming', 'Agua', 'Luz', 'Internet', 'Imprevistos', 'Salud', 'Gym', 'Gasolina', 'Vehículo', 'Vacaciones', 'Niños', 'Plan', 'Compras', 'Deportes'],

    ingreso: ['Ahorros', 'Salario', 'Quincena', 'Quincena + Incentivo', 'Otros', 'Depósito', 'Comisiones', 'Remesas']

  };



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



// Verificar y crear recordatorios mensuales automáticamente
useEffect(() => {
  if (!currentUser || !showRemindersModule || reminders.length === 0) return;

  const checkAndCreateMonthlyReminders = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dayOfMonth = today.getDate();
    
    // Solo ejecutar el día 1 de cada mes
    if (dayOfMonth !== 1) return;

    for (const reminder of reminders) {
      if (reminder.frequency !== 'mensual') continue;

      const dueDate = new Date(reminder.dueDate);
      dueDate.setHours(0, 0, 0, 0);

      // Si la fecha de vencimiento fue en el mes anterior o anterior
      const isTimeToPay = dueDate <= today;

      if (isTimeToPay) {
        try {
          // Verificar si ya existe una transacción para este recordatorio este mes
          const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          
          const transactionsQuery = query(
            collection(db, 'transactions'),
            where('userId', '==', currentUser.uid),
            where('reminderId', '==', reminder.id)
          );
          
          const existingTransactions = await getDocs(transactionsQuery);
          
          // Verificar si ya existe una transacción este mes
          const hasTransactionThisMonth = existingTransactions.docs.some(doc => {
            const transDate = new Date(doc.data().date);
            return transDate >= firstDayOfMonth && transDate <= lastDayOfMonth;
          });
          
          if (!hasTransactionThisMonth) {
            // Crear transacción automática
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

            // Actualizar fecha del recordatorio al próximo mes
            const nextMonth = new Date(today);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            nextMonth.setDate(1);
            
            await updateDoc(doc(db, 'reminders', reminder.id), {
              dueDate: nextMonth.toISOString().split('T')[0]
            });

            console.log(`Recordatorio mensual creado: ${reminder.name}`);
          }
        } catch (error) {
          console.error('Error al crear recordatorio mensual automático:', error);
        }
      }
    }
  };

  // Ejecutar al cargar
  checkAndCreateMonthlyReminders();
  
  // Ejecutar cada hora
  const interval = setInterval(checkAndCreateMonthlyReminders, 3600000);

  return () => clearInterval(interval);
}, [currentUser, showRemindersModule, reminders]);

useEffect(() => {
  if (currentUser) {
    setShowBusinessModule(currentUser.email === BUSINESS_AUTHORIZED_EMAIL);
  } else {
    setShowBusinessModule(false);
  }
}, [currentUser]);

useEffect(() => {
  if (!currentUser || !showBusinessModule) {
    setBusinessTransactions([]);
    return;
  }

  const q = query(
    collection(db, 'business_transactions'),
    where('userId', '==', currentUser.uid)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const businessData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a, b) => new Date(b.date) - new Date(a.date));
    setBusinessTransactions(businessData);
  });

  return () => unsubscribe();
}, [currentUser, showBusinessModule]);

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

      // Crear el recordatorio

      const reminderRef = await addDoc(collection(db, 'reminders'), {

        userId: currentUser.uid,

        name: reminderName,

        amount: numericAmount,

        dueDate: reminderDueDate,

        category: reminderCategory,

        frequency: reminderFrequency,

        status: 'pendiente',

        createdAt: new Date()

      });



      // Crear automáticamente la transacción en finanzas

      await addDoc(collection(db, 'transactions'), {

        userId: currentUser.uid,

        type: 'gasto',

        amount: numericAmount,

        category: reminderCategory,

        description: `${reminderName} (Recordatorio)`,

        status: 'pendiente',

        date: new Date().toISOString(),

        createdAt: new Date(),

        fromReminder: true,

        reminderId: reminderRef.id

      });



      setReminderName('');

      setReminderAmount('');

      setReminderDueDate('');

      setReminderCategory('');

      setReminderFrequency('unica');

      alert('Recordatorio y transacción agregados exitosamente');

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

      // Eliminar transacciones relacionadas primero

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

      

      // Eliminar el recordatorio

      await deleteDoc(doc(db, 'reminders', id));

      

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



      // Actualizar todas las transacciones relacionadas

      const q = query(

        collection(db, 'transactions'),

        where('userId', '==', currentUser.uid),

        where('reminderId', '==', id)

      );

      

      const snapshot = await getDocs(q);

      const updatePromises = snapshot.docs.map(docSnapshot => 

        updateDoc(doc(db, 'transactions', docSnapshot.id), {

          status: newStatus

        })

      );

      await Promise.all(updatePromises);



      alert(newStatus === 'pagado' ? 'Marcado como pagado' : 'Marcado como pendiente');

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

const filterRemindersByDate = () => {
  const filtered = filterReminders();
  const now = new Date(reminderSelectedDate);
  
  return filtered.filter(r => {
    const reminderDate = new Date(r.dueDate);
    
    if (reminderDateFilter === 'dia') {
      return reminderDate.toDateString() === now.toDateString();
    } else if (reminderDateFilter === 'mes') {
      return reminderDate.getMonth() === now.getMonth() && 
             reminderDate.getFullYear() === now.getFullYear();
    } else if (reminderDateFilter === 'ano') {
      return reminderDate.getFullYear() === now.getFullYear();
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

        createdAt: new Date(),

        fromReminder: false

      });



      setAmount('');

      setCategory('');

      setDescription('');

    } catch (error) {

      console.error('Error al agregar transacción:', error);

      alert('Error al agregar la transacción');

    }

  };



  const deleteTransaction = async (id, transaction) => {

    try {

      // Si la transacción viene de un recordatorio, también eliminar el recordatorio

      if (transaction.fromReminder && transaction.reminderId) {

        if (window.confirm('Esta transacción está vinculada a un recordatorio. ¿Deseas eliminar ambos?')) {

          await deleteDoc(doc(db, 'reminders', transaction.reminderId));

        }

      }

      

      await deleteDoc(doc(db, 'transactions', id));

    } catch (error) {

      console.error('Error al eliminar transacción:', error);

      alert('Error al eliminar la transacción');

    }

  };



  const toggleStatus = async (id, currentStatus, transaction) => {

    try {

      const newStatus = currentStatus === 'pagado' ? 'pendiente' : 'pagado';

      

      await updateDoc(doc(db, 'transactions', id), {

        status: newStatus

      });



      // Si la transacción viene de un recordatorio, actualizar el recordatorio también

      if (transaction.fromReminder && transaction.reminderId) {

        await updateDoc(doc(db, 'reminders', transaction.reminderId), {

          status: newStatus,

          paidDate: newStatus === 'pagado' ? new Date().toISOString() : null

        });

      }

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

        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md">

          <div className="text-center mb-6 sm:mb-8">

            <DollarSign className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-blue-600 mb-4" />

            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Finanzas Personales</h1>

            <p className="text-gray-600 mt-2 text-sm sm:text-base">Organiza tus ingresos y gastos</p>

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

                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"

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

                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"

                  placeholder="••••••••"

                />

              </div>

              {loginError && (

                <p className="text-red-500 text-sm text-center">{loginError}</p>

              )}

              <button

                onClick={handleLogin}

                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition text-sm sm:text-base"

              >

                Iniciar Sesión

              </button>

              <button

                onClick={() => {

                  setIsRegistering(true);

                  setLoginError('');

                }}

                className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition text-sm sm:text-base"

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

                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"

                  placeholder="tu@email.com"

                />

              </div>

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña (mínimo 6 caracteres)</label>

                <input

                  type="password"

                  value={registerForm.password}

                  onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}

                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"

                  placeholder="••••••••"

                />

              </div>

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar Contraseña</label>

                <input

                  type="password"

                  value={registerForm.confirmPassword}

                  onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}

                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"

                  placeholder="••••••••"

                />

              </div>

              {loginError && (

                <p className="text-red-500 text-sm text-center">{loginError}</p>

              )}

              <button

                onClick={handleRegister}

                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition text-sm sm:text-base"

              >

                Registrarse

              </button>

              <button

                onClick={() => {

                  setIsRegistering(false);

                  setLoginError('');

                }}

                className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition text-sm sm:text-base"

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

        <div className="max-w-6xl mx-auto px-3 sm:px-4">

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

              className="flex items-center gap-1 sm:gap-2 bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition text-sm"

            >

              <LogOut className="w-4 h-4" />

              <span className="hidden sm:inline">Cerrar Sesión</span>

              <span className="sm:hidden">Salir</span>

            </button>

          </div>



          {/* Tabs de navegación */}

          <div className="flex gap-1 sm:gap-2 border-t border-gray-200 pt-2 overflow-x-auto pb-2">

            <button

              onClick={() => setActiveTab('finanzas')}

              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-t-lg font-semibold transition whitespace-nowrap text-xs sm:text-sm ${

                activeTab === 'finanzas'

                  ? 'bg-blue-500 text-white'

                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'

              }`}

            >

              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />

              Finanzas

            </button>

            {showSavingsModule && (

              <button

                onClick={() => setActiveTab('ahorros')}

                className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-t-lg font-semibold transition whitespace-nowrap text-xs sm:text-sm ${

                  activeTab === 'ahorros'

                    ? 'bg-purple-500 text-white'

                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'

                }`}

              >

                <PiggyBank className="w-4 h-4 sm:w-5 sm:h-5" />

                Ahorros

              </button>

            )}

           {showRemindersModule && (
  <button
    onClick={() => setActiveTab('recordatorios')}
    className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-t-lg font-semibold transition whitespace-nowrap text-xs sm:text-sm ${
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
)}
{/* <<<< AQUÍ AGREGAR EL BOTÓN DE NEGOCIOS >>>> */}
{showBusinessModule && (
  <button
    onClick={() => setActiveTab('negocios')}
    className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-t-lg font-semibold transition whitespace-nowrap text-xs sm:text-sm ${
      activeTab === 'negocios'
        ? 'bg-teal-500 text-white'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
  >
    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
    Negocios
  </button>
)}
          </div>
        </div>
      </div>



      {/* Contenido */}

      <div className="max-w-6xl mx-auto p-3 sm:p-4">

        {activeTab === 'finanzas' ? (

          <>

            {/* Dashboard de Finanzas */}

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-6">

                <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Dashboard</h2>

                <div className="flex flex-wrap gap-2 w-full sm:w-auto">

                  <button

                    onClick={() => setDateFilter('dia')}

                    className={`px-3 sm:px-4 py-2 rounded-lg font-semibold transition text-xs sm:text-sm flex-1 sm:flex-none ${

                      dateFilter === 'dia' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'

                    }`}

                  >

                    Día

                  </button>

                  <button

                    onClick={() => setDateFilter('mes')}

                    className={`px-3 sm:px-4 py-2 rounded-lg font-semibold transition text-xs sm:text-sm flex-1 sm:flex-none ${

                      dateFilter === 'mes' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'

                    }`}

                  >

                    Mes

                  </button>

                  <button

                    onClick={() => setDateFilter('ano')}

                    className={`px-3 sm:px-4 py-2 rounded-lg font-semibold transition text-xs sm:text-sm flex-1 sm:flex-none ${

                      dateFilter === 'ano' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'

                    }`}

                  >

                    Año

                  </button>

                  <input

                    type="date"

                    value={selectedDate.toISOString().split('T')[0]}

                    onChange={(e) => setSelectedDate(new Date(e.target.value))}

                    className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm w-full sm:w-auto"

                  />

                </div>

              </div>



              {/* KPIs principales */}

              <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-4 mb-4 sm:mb-6">

                <div className="text-center p-3 bg-green-50 rounded-lg">

                  <p className="text-gray-600 text-xs mb-1">Total Ingresos</p>

                  <p className="text-lg sm:text-2xl font-bold text-green-600">${formatCurrency(totalIngresos)}</p>

                </div>

                <div className="text-center p-3 bg-red-50 rounded-lg">

                  <p className="text-gray-600 text-xs mb-1">Total Gastos</p>

                  <p className="text-lg sm:text-2xl font-bold text-red-600">${formatCurrency(totalGastos)}</p>

                </div>

                <div className="text-center p-3 bg-blue-50 rounded-lg">

                  <p className="text-gray-600 text-xs mb-1">Balance</p>

                  <p className={`text-lg sm:text-2xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>

                    ${formatCurrency(Math.abs(balance))}

                  </p>

                </div>

                <div className="text-center p-3 bg-yellow-50 rounded-lg">

                  <p className="text-gray-600 text-xs mb-1">Pendientes</p>

                  <p className="text-lg sm:text-2xl font-bold text-yellow-600">

                    {filteredTransactions.filter(t => t.type === 'gasto' && t.status === 'pendiente').length}

                  </p>

                </div>

                <div className="text-center p-3 bg-green-50 rounded-lg">

                  <p className="text-gray-600 text-xs mb-1">Pagados</p>

                  <p className="text-lg sm:text-2xl font-bold text-green-600">

                    {filteredTransactions.filter(t => t.type === 'gasto' && t.status === 'pagado').length}

                  </p>

                </div>

                <div className="text-center p-3 bg-purple-50 rounded-lg">

                  <p className="text-gray-600 text-xs mb-1">Transacciones</p>

                  <p className="text-lg sm:text-2xl font-bold text-purple-600">{filteredTransactions.length}</p>

                </div>

              </div>



              {/* Gráficos */}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

                {/* Gráfico de categorías de gastos */}

                <div>

                  <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Gastos por Categoría</h3>

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

                            <div className="flex justify-between text-xs sm:text-sm">

                              <span className="font-semibold text-gray-700">{category}</span>

                              <span className="text-gray-600">${formatCurrency(amount)}</span>

                            </div>

                            <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">

                              <div

                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 sm:h-3 rounded-full transition-all"

                                style={{ width: `${(amount / maxAmount) * 100}%` }}

                              ></div>

                            </div>

                          </div>

                        ))

                      ) : (

                        <p className="text-gray-500 text-center py-8 text-sm">No hay datos de gastos</p>

                      );

                    })()}

                  </div>

                </div>



                {/* Gráfico de ingresos por categoría */}

                <div>

                  <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Ingresos por Categoría</h3>

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

                            <div className="flex justify-between text-xs sm:text-sm">

                              <span className="font-semibold text-gray-700">{category}</span>

                              <span className="text-gray-600">${formatCurrency(amount)}</span>

                            </div>

                            <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">

                              <div

                                className="bg-gradient-to-r from-green-500 to-green-600 h-2 sm:h-3 rounded-full transition-all"

                                style={{ width: `${(amount / maxAmount) * 100}%` }}

                              ></div>

                            </div>

                          </div>

                        ))

                      ) : (

                        <p className="text-gray-500 text-center py-8 text-sm">No hay datos de ingresos</p>

                      );

                    })()}

                  </div>

                </div>

              </div>

            </div>



            {/* Agregar Transacción */}

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">

              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Agregar Transacción</h2>

              

              <div className="flex gap-2 sm:gap-4 mb-4">

                <button

                  onClick={() => setTransactionType('gasto')}

                  className={`flex-1 py-2 sm:py-3 rounded-lg font-semibold transition text-sm sm:text-base ${

                    transactionType === 'gasto' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'

                  }`}

                >

                  Gasto

                </button>

                <button

                  onClick={() => setTransactionType('ingreso')}

                  className={`flex-1 py-2 sm:py-3 rounded-lg font-semibold transition text-sm sm:text-base ${

                    transactionType === 'ingreso' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'

                  }`}

                >

                  Ingreso

                </button>

              </div>



              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">

                <div>

                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Monto</label>

                  <input

                    type="number"

                    value={amount}

                    onChange={(e) => setAmount(e.target.value)}

                    placeholder="0.00"

                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"

                  />

                </div>

                <div>

                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Categoría</label>

                  <select

                    value={category}

                    onChange={(e) => setCategory(e.target.value)}

                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"

                  >

                    <option value="">Seleccionar</option>

                    {categories[transactionType].map(cat => (

                      <option key={cat} value={cat}>{cat}</option>

                    ))}

                  </select>

                </div>

              </div>



              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">

                <div>

                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Descripción</label>

                  <input

                    type="text"

                    value={description}

                    onChange={(e) => setDescription(e.target.value)}

                    placeholder="Opcional"

                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"

                  />

                </div>

                {transactionType === 'gasto' && (

                  <div>

                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Estado</label>

                    <select

                      value={status}

                      onChange={(e) => setStatus(e.target.value)}

                      className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"

                    >

                      <option value="pendiente">Pendiente</option>

                      <option value="pagado">Pagado</option>

                    </select>

                  </div>

                )}

              </div>



              <button

                onClick={addTransaction}

                className="w-full bg-blue-600 text-white py-2 sm:py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2 text-sm sm:text-base"

              >

                <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />

                Agregar

              </button>

            </div>



            {/* Historial de Transacciones */}

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">

              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Historial</h2>

              <div className="space-y-3">

                {filteredTransactions.length === 0 ? (

                  <p className="text-gray-500 text-center py-8 text-sm">No hay transacciones registradas</p>

                ) : (

                  filteredTransactions.map(transaction => (

                    <div

                      key={transaction.id}

                      className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition"

                    >

                      <div className="flex justify-between items-start gap-3">

                        <div className="flex-1 min-w-0">

                          <div className="flex items-center gap-2 mb-2 flex-wrap">

                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${

                              transaction.type === 'ingreso' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'

                            }`}>

                              {transaction.type === 'ingreso' ? 'Ingreso' : 'Gasto'}

                            </span>

                            <span className="font-semibold text-gray-700 text-xs sm:text-sm truncate">{transaction.category}</span>

                            {transaction.fromReminder && (

                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">

                                📌 Recordatorio

                              </span>

                            )}

                          </div>

                          <p className="text-gray-600 text-xs sm:text-sm truncate">{transaction.description || 'Sin descripción'}</p>

                          <p className="text-xs text-gray-400 mt-1">

                            {new Date(transaction.date).toLocaleDateString('es-ES')}

                          </p>

                        </div>

                        <div className="flex flex-col items-end gap-2">

                          <span className={`text-lg sm:text-2xl font-bold ${

                            transaction.type === 'ingreso' ? 'text-green-600' : 'text-red-600'

                          }`}>

                            ${transaction.amount.toFixed(2)}

                          </span>

                          <div className="flex gap-1 sm:gap-2">

                            {transaction.type === 'gasto' && (

                              <button

                                onClick={() => toggleStatus(transaction.id, transaction.status, transaction)}

                                className={`px-2 sm:px-3 py-1 rounded text-xs font-semibold transition ${

                                  transaction.status === 'pagado'

                                    ? 'bg-green-500 text-white hover:bg-green-600'

                                    : 'bg-yellow-500 text-white hover:bg-yellow-600'

                                }`}

                              >

                                {transaction.status === 'pagado' ? 'Pagado' : 'Pendiente'}

                              </button>

                            )}

                            <button

                              onClick={() => deleteTransaction(transaction.id, transaction)}

                              className="bg-red-500 text-white p-1 sm:p-2 rounded hover:bg-red-600 transition"

                            >

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

          <>

            {/* Módulo de Ahorros - Diseño Responsive */}

            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">

              <div className="flex items-center gap-2 sm:gap-3 mb-2">

                <PiggyBank className="w-8 h-8 sm:w-10 sm:h-10" />

                <div>

                  <h2 className="text-xl sm:text-2xl font-bold">Cuenta de Inversión</h2>

                  <p className="text-purple-100 text-xs sm:text-sm">Retorno anual: 11% | Interés compuesto diario</p>

                </div>

              </div>

            </div>



            {/* Dashboard de Inversión */}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">

              {(() => {

                const { totalInvested, totalInterest, accumulated } = calculateCompoundInterest();

                return (

                  <>

                    <div className="bg-blue-500 text-white rounded-lg shadow-lg p-4 sm:p-6">

                      <p className="text-blue-100 text-xs sm:text-sm">Total Invertido</p>

                      <p className="text-2xl sm:text-3xl font-bold">${formatCurrency(totalInvested)}</p>

                    </div>

                    <div className="bg-green-500 text-white rounded-lg shadow-lg p-4 sm:p-6">

                      <p className="text-green-100 text-xs sm:text-sm">Intereses Ganados</p>

                      <p className="text-2xl sm:text-3xl font-bold">${formatCurrency(totalInterest)}</p>

                      <p className="text-green-100 text-xs mt-1">

                        +{totalInvested > 0 ? ((totalInterest / totalInvested) * 100).toFixed(2) : 0}%

                      </p>

                    </div>

                    <div className="bg-purple-500 text-white rounded-lg shadow-lg p-4 sm:p-6">

                      <p className="text-purple-100 text-xs sm:text-sm">Valor Total Actual</p>

                      <p className="text-2xl sm:text-3xl font-bold">${formatCurrency(accumulated)}</p>

                    </div>

                  </>

                );

              })()}

            </div>



            {/* Agregar Ahorro */}

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">

              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Agregar Ahorro</h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4">

                <div>

                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Nombre del Ahorro</label>

                  <input

                    type="text"

                    value={savingName}

                    onChange={(e) => setSavingName(e.target.value)}

                    placeholder="Ej: Ahorro mensual"

                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"

                  />

                </div>

                <div>

                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Cantidad</label>

                  <input

                    type="text"

                    value={savingAmount}

                    onChange={(e) => handleAmountInput(e.target.value)}

                    placeholder="5,000.00"

                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"

                  />

                </div>

                <div>

                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Fecha</label>

                  <input

                    type="date"

                    value={savingDate}

                    onChange={(e) => setSavingDate(e.target.value)}

                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"

                  />

                </div>

              </div>

              <button

                onClick={addSaving}

                className="w-full bg-purple-600 text-white py-2 sm:py-3 rounded-lg font-semibold hover:bg-purple-700 transition flex items-center justify-center gap-2 text-sm sm:text-base"

              >

                <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />

                Agregar Ahorro

              </button>

            </div>



            {/* Historial de Ahorros - Responsive */}

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">

              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Historial de Ahorros</h2>

              <div className="space-y-3">

                {savings.length === 0 ? (

                  <p className="text-gray-500 text-center py-8 text-sm">No hay ahorros registrados</p>

                ) : (

                  calculateCompoundInterest().history.map((saving) => (

                    <div

                      key={saving.id}

                      className="border-2 border-purple-200 rounded-lg p-3 sm:p-4 hover:shadow-lg transition bg-gradient-to-r from-purple-50 to-indigo-50"

                    >

                      <div className="flex justify-between items-start gap-3">

                        <div className="flex-1 min-w-0">

                          <div className="flex items-center gap-2 mb-2 flex-wrap">

                            <span className="font-bold text-sm sm:text-lg text-gray-800 truncate">{saving.name}</span>

                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">

                              {new Date(saving.date).toLocaleDateString('es-ES', {

                                day: '2-digit',

                                month: 'short',

                                year: 'numeric'

                              })}

                            </span>

                          </div>

                          

                          <div className="grid grid-cols-2 gap-2 mb-2">

                            <div className="bg-white rounded-lg p-2 border border-purple-100">

                              <p className="text-xs text-gray-500">Invertido</p>

                              <p className="text-sm sm:text-lg font-bold text-blue-600">${formatCurrency(saving.amount)}</p>

                            </div>

                            

                            <div className="bg-white rounded-lg p-2 border border-green-100">

                              <p className="text-xs text-gray-500">Intereses</p>

                              <p className="text-sm sm:text-lg font-bold text-green-600">+${formatCurrency(saving.interestEarned)}</p>

                            </div>

                          </div>



                          <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-gray-600">

                            <div>

                              <span className="font-semibold">Días:</span> {saving.daysElapsed}

                            </div>

                            <div>

                              <span className="font-semibold">Rendimiento:</span> +{((saving.interestEarned / saving.amount) * 100).toFixed(2)}%

                            </div>

                          </div>

                        </div>

                        

                        <div className="flex flex-col items-end gap-2">

                          <div className="text-right bg-gradient-to-br from-purple-100 to-indigo-100 rounded-lg p-2 sm:p-3 border-2 border-purple-200">

                            <p className="text-xs text-purple-600 font-semibold">Valor Actual</p>

                            <p className="text-lg sm:text-2xl font-bold text-purple-700">

                              ${formatCurrency(saving.currentValue)}

                            </p>

                          </div>

                          <button

                            onClick={() => deleteSaving(saving.id)}

                            className="bg-red-500 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-lg hover:bg-red-600 transition flex items-center gap-1 text-xs sm:text-sm"

                          >

                            <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />

                            Eliminar

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

            {/* Módulo de Recordatorios - Responsive */}

            <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">

              <div className="flex items-center gap-2 sm:gap-3 mb-2">

                <svg className="w-8 h-8 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />

                </svg>

                <div>

                  <h2 className="text-xl sm:text-2xl font-bold">Recordatorios de Pagos</h2>

                  <p className="text-orange-100 text-xs sm:text-sm">Préstamos, Tarjetas y Servicios</p>

                </div>

              </div>

            </div>
{/* Filtros de fecha para recordatorios */}
<div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
  <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Filtrar por Fecha</h3>
  <div className="flex flex-wrap gap-2 items-center">
    <button
      onClick={() => setReminderDateFilter('dia')}
      className={`px-3 sm:px-4 py-2 rounded-lg font-semibold transition text-xs sm:text-sm ${
        reminderDateFilter === 'dia' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      Día
    </button>
    <button
      onClick={() => setReminderDateFilter('mes')}
      className={`px-3 sm:px-4 py-2 rounded-lg font-semibold transition text-xs sm:text-sm ${
        reminderDateFilter === 'mes' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      Mes
    </button>
    <button
      onClick={() => setReminderDateFilter('ano')}
      className={`px-3 sm:px-4 py-2 rounded-lg font-semibold transition text-xs sm:text-sm ${
        reminderDateFilter === 'ano' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      Año
    </button>
    <input
      type="date"
      value={reminderSelectedDate.toISOString().split('T')[0]}
      onChange={(e) => setReminderSelectedDate(new Date(e.target.value))}
      className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm"
    />
  </div>
</div>



            {/* Dashboard de Recordatorios - Responsive */}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">

              {(() => {
  const filteredByDate = filterRemindersByDate();
  const totalReminders = filteredByDate.length;
  const pendingReminders = filteredByDate.filter(r => r.status === 'pendiente');
  const totalPending = pendingReminders.reduce((sum, r) => sum + r.amount, 0);
  const overdueReminders = pendingReminders.filter(r => getDaysUntilDue(r.dueDate) < 0);
  const dueSoonReminders = pendingReminders.filter(r => {
    const days = getDaysUntilDue(r.dueDate);
    return days >= 0 && days <= 7;
  });

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 border-l-4 border-orange-500">
        <p className="text-gray-600 text-xs sm:text-sm mb-1">Total</p>
        <p className="text-xl sm:text-2xl font-bold text-orange-600">{totalReminders}</p>
        <p className="text-xs text-gray-500 mt-1">
          {pendingReminders.length} pendientes
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 border-l-4 border-red-500">
        <p className="text-gray-600 text-xs sm:text-sm mb-1">Monto</p>
        <p className="text-lg sm:text-2xl font-bold text-red-600">${formatCurrency(totalPending)}</p>
        <p className="text-xs text-gray-500 mt-1">Por pagar</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 border-l-4 border-yellow-500">
        <p className="text-gray-600 text-xs sm:text-sm mb-1">Pronto</p>
        <p className="text-xl sm:text-2xl font-bold text-yellow-600">{dueSoonReminders.length}</p>
        <p className="text-xs text-gray-500 mt-1">
          ${formatCurrency(dueSoonReminders.reduce((sum, r) => sum + r.amount, 0))}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 border-l-4 border-purple-500">
        <p className="text-gray-600 text-xs sm:text-sm mb-1">Vencidos</p>
        <p className="text-xl sm:text-2xl font-bold text-purple-600">{overdueReminders.length}</p>
        <p className="text-xs text-gray-500 mt-1">
          ${formatCurrency(overdueReminders.reduce((sum, r) => sum + r.amount, 0))}
        </p>
      </div>
    </>
  );
})()}

            </div>



           {/* Dashboard por Categoría */}
<div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
  <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-4">Recordatorios por Categoría</h3>
  <div className="space-y-3">
    {(() => {
      const categoryTotals = {};
      const categoryCounts = {};
      
      filterRemindersByDate().filter(r => r.status === 'pendiente').forEach(r => {
        categoryTotals[r.category] = (categoryTotals[r.category] || 0) + r.amount;
        categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
      });
      
      const sortedCategories = Object.entries(categoryTotals)
        .sort((a, b) => b[1] - a[1]);

      const maxAmount = sortedCategories[0]?.[1] || 1;

      return sortedCategories.length > 0 ? (
        sortedCategories.map(([category, amount]) => (
          <div key={category} className="space-y-1">
            <div className="flex justify-between text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">{category}</span>
                <span className="text-xs text-gray-500">({categoryCounts[category]} recordatorios)</span>
              </div>
              <span className="text-gray-600 font-bold">${formatCurrency(amount)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
              <div
                className="bg-gradient-to-r from-orange-500 to-red-600 h-2 sm:h-3 rounded-full transition-all"
                style={{ width: `${(amount / maxAmount) * 100}%` }}
              ></div>
            </div>
          </div>
        ))
      ) : (
        <p className="text-gray-500 text-center py-4 text-sm">No hay recordatorios pendientes en este período</p>
      );
    })()}
  </div>
</div>



            {/* Agregar Recordatorio - Responsive */}

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">

              <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Agregar Recordatorio</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">

                <div>

                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Nombre</label>

                  <input

                    type="text"

                    value={reminderName}

                    onChange={(e) => setReminderName(e.target.value)}

                    placeholder="Ej: Pago tarjeta Visa"

                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm sm:text-base"

                  />

                </div>

                <div>

                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Monto</label>

                  <input

                    type="text"

                    value={reminderAmount}

                    onChange={(e) => handleReminderAmountInput(e.target.value)}

                    placeholder="5,000.00"

                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm sm:text-base"

                  />

                </div>

                <div>

                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Fecha Vencimiento</label>

                  <input

                    type="date"

                    value={reminderDueDate}

                    onChange={(e) => setReminderDueDate(e.target.value)}

                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm sm:text-base"

                  />

                </div>

                <div>

                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Categoría</label>

                  <select

                    value={reminderCategory}

                    onChange={(e) => setReminderCategory(e.target.value)}

                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm sm:text-base"

                  >

                    <option value="">Seleccionar</option>

                    {reminderCategories.map(cat => (

                      <option key={cat} value={cat}>{cat}</option>

                    ))}

                  </select>

                </div>

                <div>

                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Frecuencia</label>

                  <select

                    value={reminderFrequency}

                    onChange={(e) => setReminderFrequency(e.target.value)}

                    className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm sm:text-base"

                  >

                    <option value="unica">Única vez</option>

                    <option value="mensual">Mensual (se crea automático día 1)</option>

                    <option value="quincenal">Quincenal</option>

                    <option value="anual">Anual</option>

                  </select>

                </div>

              </div>

              <button

                onClick={addReminder}

                className="w-full bg-orange-600 text-white py-2 sm:py-3 rounded-lg font-semibold hover:bg-orange-700 transition flex items-center justify-center gap-2 text-sm sm:text-base"

              >

                <PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />

                Agregar Recordatorio

              </button>

            </div>



            {/* Lista de Recordatorios - Responsive */}

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">

              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">

                <h2 className="text-lg sm:text-xl font-bold text-gray-800">Mis Recordatorios</h2>

                <div className="flex gap-1 sm:gap-2 flex-wrap w-full sm:w-auto">

                  <button

                    onClick={() => setReminderFilter('todos')}

                    className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg font-semibold transition text-xs sm:text-sm ${

                      reminderFilter === 'todos' ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'

                    }`}

                  >

                    Todos ({reminders.length})

                  </button>

                  <button

                    onClick={() => setReminderFilter('pendientes')}

                    className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg font-semibold transition text-xs sm:text-sm ${

                      reminderFilter === 'pendientes' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'

                    }`}

                  >

                    Pendientes

                  </button>

                  <button

                    onClick={() => setReminderFilter('pronto')}

                    className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg font-semibold transition text-xs sm:text-sm ${

                      reminderFilter === 'pronto' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'

                    }`}

                  >

                    Pronto

                  </button>

                  <button

                    onClick={() => setReminderFilter('vencidos')}

                    className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg font-semibold transition text-xs sm:text-sm ${

                      reminderFilter === 'vencidos' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'

                    }`}

                  >

                    Vencidos

                  </button>

                  <button

                    onClick={() => setReminderFilter('pagados')}

                    className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg font-semibold transition text-xs sm:text-sm ${

                      reminderFilter === 'pagados' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'

                    }`}

                  >

                    Pagados

                  </button>

                </div>

              </div>

             <div className="space-y-3">
  {filterRemindersByDate().length === 0 ? (
    <p className="text-gray-500 text-center py-8 text-sm">No hay recordatorios en esta categoría</p>
  ) : (
    filterRemindersByDate().map((reminder) => {

                    const daysUntil = getDaysUntilDue(reminder.dueDate);

                    const isOverdue = daysUntil < 0;

                    const isDueSoon = daysUntil >= 0 && daysUntil <= 7;

                    

                    return (

                      <div

                        key={reminder.id}

                        className={`border-2 rounded-lg p-3 sm:p-4 hover:shadow-lg transition ${

                          reminder.status === 'pagado' 

                            ? 'border-green-200 bg-green-50' 

                            : isOverdue 

                            ? 'border-red-300 bg-red-50'

                            : isDueSoon

                            ? 'border-yellow-300 bg-yellow-50'

                            : 'border-gray-200 bg-white'

                        }`}

                      >

                        <div className="flex justify-between items-start gap-3">

                          <div className="flex-1 min-w-0">

                            <div className="flex items-center gap-2 mb-2 flex-wrap">

                              <span className="font-bold text-sm sm:text-lg text-gray-800 truncate">{reminder.name}</span>

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

                            

                            <div className="space-y-1 text-xs sm:text-sm mb-2">

                              <div>

                                <span className="text-gray-600">Categoría:</span>

                                <span className="font-semibold ml-1 sm:ml-2">{reminder.category}</span>

                              </div>

                              <div>

                                <span className="text-gray-600">Frecuencia:</span>

                                <span className="font-semibold ml-1 sm:ml-2 capitalize">{reminder.frequency}</span>

                              </div>

                              <div>

                                <span className="text-gray-600">Vence:</span>

                                <span className="font-semibold ml-1 sm:ml-2">

                                  {new Date(reminder.dueDate).toLocaleDateString('es-ES')}

                                </span>

                              </div>

                              {reminder.status === 'pagado' && reminder.paidDate && (

                                <div>

                                  <span className="text-gray-600">Pagado:</span>

                                  <span className="font-semibold ml-1 sm:ml-2 text-green-600">

                                    {new Date(reminder.paidDate).toLocaleDateString('es-ES')}

                                  </span>

                                </div>

                              )}

                            </div>

                          </div>

                          

                          <div className="flex flex-col items-end gap-2">

                            <p className="text-lg sm:text-2xl font-bold text-orange-600">

                              ${formatCurrency(reminder.amount)}

                            </p>

                            <div className="flex gap-1 sm:gap-2 flex-wrap justify-end">

                              <button

                                onClick={() => toggleReminderStatus(reminder.id, reminder.status, reminder)}

                                className={`px-2 sm:px-4 py-1 sm:py-2 rounded-lg font-semibold transition text-xs sm:text-sm ${

                                  reminder.status === 'pagado'

                                    ? 'bg-yellow-500 text-white hover:bg-yellow-600'

                                    : 'bg-green-500 text-white hover:bg-green-600'

                                }`}

                              >

                                {reminder.status === 'pagado' ? 'Desmarcar' : 'Marcar Pagado'}

                              </button>

                              <button

                                onClick={() => deleteReminder(reminder.id)}

                                className="bg-red-500 text-white p-1 sm:p-2 rounded-lg hover:bg-red-600 transition"

                              >

                                <Trash2 className="w-3 h-3 sm:w-5 sm:h-5" />

                              </button>

                            </div>

                          </div>

                        </div>

                      </div>

                    );

                </>
        ) : activeTab === 'negocios' ? (
          <>
            {/* TODO EL CÓDIGO DEL MÓDULO DE NEGOCIOS VA AQUÍ */}
          </>
        )}
