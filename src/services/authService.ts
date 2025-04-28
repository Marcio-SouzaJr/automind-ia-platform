// src/services/authService.ts

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    UserCredential,
    AuthError
} from 'firebase/auth';
import {
    doc,
    setDoc,
    Timestamp
} from 'firebase/firestore';

// Importar instâncias 'auth' e 'db' da configuração
import { auth, db } from '../config/firebaseConfig';
// Importar a função para buscar a empresa pelo código
import { findCompanyByCode } from './firestoreService'; // Certifique-se que o caminho está correto

// --- Função de Cadastro (Signup) ---
// Assinatura atualizada para aceitar companyCode
export const signUp = async (email: string, password: string, companyCode: string): Promise<UserCredential> => {

    try {
        // 1. Buscar a empresa PELO CÓDIGO ANTES de criar o usuário Auth
        const company = await findCompanyByCode(companyCode);

        // 2. Verificar se a empresa foi encontrada
        if (!company) {
             console.error(`Empresa não encontrada para o código: ${companyCode}`);
             // Lança um erro específico que a UI pode tratar
             throw new Error(`Código da empresa inválido ou não encontrado.`);
        }
        // Log se a empresa for encontrada (opcional)
        console.log(`Empresa encontrada para cadastro: ${company.id} (Nome: ${company.data.name})`);

        // 3. Se a empresa foi encontrada, prosseguir com a criação no Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('✅ Usuário cadastrado no Auth:', user.uid);

        // 4. Criar referência ao documento do usuário no Firestore (ID = UID do Auth)
        const userDocRef = doc(db, "users", user.uid);

        // 5. Definir os dados para o documento do usuário
        const userData = {
            email: user.email,                 // Email do Auth
            // name: "Nome (a coletar)",       // Futuramente, pegar do formulário
            companyId: company.id,             // USA O ID REAL DA EMPRESA ENCONTRADA
            role: "member",                    // Papel padrão inicial
            createdAt: Timestamp.now()         // Data de criação
        };

        // 6. Escrever (criar) o documento no Firestore
        await setDoc(userDocRef, userData);
        console.log('📄 Documento do usuário criado no Firestore com ID:', user.uid);

        // 7. Retornar as credenciais do Auth
        return userCredential;

    } catch (error) {
        // Tratamento de erro agora pega erros do findCompanyByCode, Auth ou setDoc
        const typedError = error as (AuthError | Error); // Tipar para acessar 'code' ou 'message'
        console.error('❌ Erro no serviço de cadastro (signUp):', typedError);
        if ((typedError as AuthError).code) { // Se tiver 'code', loga especificamente
             console.error('   Código do erro Auth:', (typedError as AuthError).code);
        }
        // Relança o erro original para a UI tratar
        throw typedError;
    }
};

// --- Função de Login (Signin) ---
// (Nenhuma mudança, permanece como antes)
export const signIn = async (email: string, password: string): Promise<UserCredential> => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('✅ Usuário logado com sucesso:', userCredential.user.uid);
        return userCredential;
    } catch (error) {
        const authError = error as AuthError;
        console.error('❌ Erro no serviço de login (signIn):', authError.code, authError.message);
        throw authError;
    }
};

// --- Função de Logout ---
// (Nenhuma mudança, permanece como antes)
export const logOut = async (): Promise<void> => {
    try {
        await signOut(auth);
        console.log('🚪 Logout realizado com sucesso.');
    } catch (error) {
        const authError = error as AuthError;
        console.error('❌ Erro no serviço de logout (logOut):', authError.code, authError.message);
        throw authError;
    }
};