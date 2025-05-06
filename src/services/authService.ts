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
import { getFunctions, httpsCallable } from "firebase/functions";
// Importar instâncias 'auth' e 'db' da configuração
import { auth, db, app } from '../config/firebaseConfig';
// Importar a função para buscar a empresa pelo código
const functions = getFunctions(app); // Passar a instância 'app'

// --- Função de Cadastro (Signup) ---
// Assinatura atualizada para aceitar companyCode
export const signUp = async (email: string, password: string, companyCode: string): Promise<UserCredential> => {

    if (!companyCode) throw new Error("Código da empresa é obrigatório."); // Validação inicial

    try {
        // --- 👇 Chamar Cloud Function para Validar Código ANTES 👇 ---
        console.log(`Chamando CF validateCompanyCode com código: ${companyCode}`);
        const validateFn = httpsCallable(functions, 'validateCompanyCode');
        let companyId = null;

        try {
            const validationResult = await validateFn({ companyCode: companyCode.trim() });
            // Extrai companyId do data retornado pela função
            companyId = (validationResult.data as { success: boolean; companyId: string }).companyId;
            if (!companyId) throw new Error("ID da empresa não retornado pela validação."); // Segurança extra
            console.log(`Código validado. Company ID: ${companyId}`);
        } catch (validationError: any) {
            console.error("Erro da Cloud Function validateCompanyCode:", validationError);
            // Tratar erros específicos da CF (ex: 'not-found' que definimos)
            if (validationError.code === 'functions/not-found') {
                throw new Error(`Código da empresa inválido ou não encontrado.`);
            }
            // Outros erros da CF
            throw new Error(validationError.message || "Falha ao validar código da empresa.");
        }
        // --- Fim da Chamada da Cloud Function ---


        // --- 5. Se a validação passou, prosseguir com Auth ---
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log('✅ Usuário cadastrado no Auth:', user.uid);

        // --- 6. Criar doc no Firestore com o companyId validado ---
        const userDocRef = doc(db, "users", user.uid);
        const userData = {
            email: user.email,
            companyId: companyId, // <-- Usa o ID retornado pela CF
            role: "member",
            createdAt: Timestamp.now() // Usar Timestamp do cliente aqui é ok
        };
        await setDoc(userDocRef, userData);
        console.log('📄 Documento do usuário criado no Firestore com ID:', user.uid);

        // --- 7. Retornar credenciais ---
        return userCredential;

    } catch (error: any) {
        // Captura erros da validação (re-lançados) ou do createUserWithEmailAndPassword ou do setDoc
        console.error('❌ Erro GERAL no serviço de cadastro (signUp):', error);
        // Retorna a mensagem de erro já tratada (ou a original se for de outra fonte)
        throw error;
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