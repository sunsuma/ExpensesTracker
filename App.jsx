import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  Button,
  StyleSheet,
  PermissionsAndroid,
  Alert,
  SafeAreaView,
} from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';

const App = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [debug, setDebug] = useState('');

  useEffect(() => {
    if (permissionGranted) {
      scanSmsForExpenses();
    }
  }, [permissionGranted]);

  const requestSmsPermission = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_SMS,
        {
          title: 'SMS Permission',
          message: 'This app needs access to your SMS to scan for expenses.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        log('SMS permission granted');
        setPermissionGranted(true);
      } else {
        log('SMS permission denied');
        setPermissionGranted(false);
        Alert.alert(
          'Permission Denied',
          'The app cannot function without SMS access.',
        );
      }
    } catch (err) {
      log('Error requesting permission: ' + err);
      Alert.alert('Error', 'Failed to request SMS permission.');
    }
  };

  const log = message => {
    console.log(message);
    setDebug(prev => prev + message + '\n');
  };

  const scanSmsForExpenses = () => {
    setLoading(true);
    setExpenses([]);
    setDebug('');

    const filter = {
      box: 'inbox',
      indexFrom: 0,
      maxCount: 100,
    };

    log('Starting SMS scan with filter: ' + JSON.stringify(filter));

    SmsAndroid.list(
      JSON.stringify(filter),
      fail => {
        log('Failed to load SMS: ' + fail);
        setLoading(false);
        Alert.alert('Error', 'Failed to load SMS messages: ' + fail);
      },
      (count, smsList) => {
        log(`Received ${count} messages`);
        try {
          const parsedList = JSON.parse(smsList);
          log(`Successfully parsed ${parsedList.length} messages`);
          const newExpenses = parsedList
            .map(sms => {
              const expense = parseExpenseFromSms(sms.body, sms.date);
              if (expense) {
                log(`Found expense: ${JSON.stringify(expense)}`);
              }
              return expense;
            })
            .filter(expense => expense !== null);
          log(`Detected ${newExpenses.length} expenses`);
          setExpenses(newExpenses);
        } catch (error) {
          log('Error parsing SMS list: ' + error);
          Alert.alert('Error', 'Failed to parse SMS messages.');
        } finally {
          setLoading(false);
        }
      },
    );
  };

  const parseExpenseFromSms = (body, date) => {
    const amountRegex = /(?:RS|INR|₹)\s?(\d+(:?\.\d{1,2})?)/i;
    const amountMatch = body.match(amountRegex);

    if (amountMatch) {
      const amount = parseFloat(amountMatch[1]);
      const description = body.replace(amountRegex, '').slice(0, 50) + '...';
      return {
        amount: amount,
        description: description,
        date: new Date(parseInt(date)).toLocaleDateString(),
      };
    }
    return null;
  };

  const handleScanPress = () => {
    if (!permissionGranted) {
      requestSmsPermission();
    } else {
      scanSmsForExpenses();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>SMS Expense Scanner</Text>
      <Button
        title={loading ? 'Scanning...' : 'View All Expenses'}
        onPress={handleScanPress}
        disabled={loading}
      />
      <View style={styles.ExpenseContainer}>
        {expenses.length > 0 ? (
          <FlatList
            data={expenses}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({item}) => (
              <View style={styles.expenseItem}>
                <Text style={styles.amount}>₹{item.amount.toFixed(2)}</Text>
                <Text style={styles.description}>{item.description}</Text>
                <Text style={styles.date}>{item.date}</Text>
              </View>
            )}
          />
        ) : (
          <Text style={styles.noExpenses}>
            {loading
              ? 'Scanning for expenses...'
              : 'No expenses found. Tap the button to scan.'}
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  expenseItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 5,
    marginBottom: 10,
    elevation: 3,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 16,
    color: '#555',
  },
  date: {
    fontSize: 14,
    color: '#888',
  },
  noExpenses: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  ExpenseContainer: {
    flex: 1,
    marginTop: 10,
  },
});

export default App;
