import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import dbConnect from './db';
import { User } from '../models/User';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        
        await dbConnect();
        
        const user = await User.findOne({ username: credentials.username });
        if (!user) return null;
        
        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!isValid) return null;
        
        return { id: user._id.toString(), name: user.username };
      }
    })
  ],
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' }
};

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect('/login');
  }
  return session;
}
