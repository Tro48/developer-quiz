import { StyleSheet, Text, View } from 'react-native';

export default function IndexRoute() {
  return (
    <View style={styles.root}>
      <Text style={styles.text}>Developer Quiz</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F1115' },
  text: { color: '#F2F4F8', fontSize: 20 },
});
