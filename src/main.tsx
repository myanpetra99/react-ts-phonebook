
import ReactDOM from 'react-dom/client'
import "./index.css"
import App from './pages/ContactList'
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';

const client = new ApolloClient({
  uri: 'https://wpe-hiring.tokopedia.net/graphql',
  cache: new InMemoryCache(),
});

ReactDOM.createRoot(document.getElementById('root')!).render(
<ApolloProvider client={client}>
<App />
  </ApolloProvider>)
