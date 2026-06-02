/*
 * data.js — 球極 データ永続化レイヤー（Firebase Firestore版）
 *
 * mail.html側のコードは一切変更不要。
 *
 * API:
 *   await db.members.getAll()          → [{id, name, email, gender, phone}, ...]
 *   await db.members.get(id)           → {id, name, email, gender, phone} | null
 *   await db.members.add(data)         → {id, ...data}
 *   await db.members.update(id, data)  → {id, ...merged}
 *   await db.members.delete(id)        → true
 */

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyD4ngsYFNTwlWoNYJJTRTbxRxfCWt0hkec",
  authDomain: "kyu-kyoku-golf.firebaseapp.com",
  projectId: "kyu-kyoku-golf",
  storageBucket: "kyu-kyoku-golf.firebasestorage.app",
  messagingSenderId: "775632466263",
  appId: "1:775632466263:web:4cc95a7a3f298da6204e12"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const firestore = firebase.firestore();

const db = (function() {
  const col = firestore.collection('members');

  const members = {
    async getAll() {
      const snap = await col.orderBy('name').get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async get(id) {
      const doc = await col.doc(id).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    },

    async add(data) {
      if (!data.email || !data.email.trim()) {
        throw new Error('emailは必須です');
      }
      const member = {
        name: (data.name || '').trim(),
        email: data.email.trim(),
        gender: (data.gender || '').trim(),
        phone: (data.phone || '').trim(),
        createdAt: new Date().toISOString()
      };
      const ref = await col.add(member);
      return { id: ref.id, ...member };
    },

    async update(id, data) {
      if (data.email !== undefined && !data.email.trim()) {
        throw new Error('emailは必須です');
      }
      const updates = { updatedAt: new Date().toISOString() };
      if (data.name !== undefined) updates.name = data.name.trim();
      if (data.email !== undefined) updates.email = data.email.trim();
      if (data.gender !== undefined) updates.gender = data.gender.trim();
      if (data.phone !== undefined) updates.phone = data.phone.trim();

      await col.doc(id).update(updates);
      const doc = await col.doc(id).get();
      return { id: doc.id, ...doc.data() };
    },

    async delete(id) {
      await col.doc(id).delete();
      return true;
    },

    async count() {
      const snap = await col.get();
      return snap.size;
    },

    async updateHC(id, hc) {
      await col.doc(id).update({ hc: hc, updatedAt: new Date().toISOString() });
      return true;
    }
  };

  const rounds = {
    async add(data) {
      const round = {
        date: data.date,
        course: data.course,
        address: (data.address || '').trim(),
        createdAt: new Date().toISOString()
      };
      const ref = await firestore.collection('rounds').add(round);
      return { id: ref.id, ...round };
    },

    async get(id) {
      const doc = await firestore.collection('rounds').doc(id).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    },

    async getRecent(limit = 10) {
      const snap = await firestore.collection('rounds')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async delete(id) {
      await firestore.collection('rounds').doc(id).delete();
      return true;
    }
  };

  const scores = {
    async add(data) {
      const score = {
        roundId: data.roundId,
        memberId: data.memberId,
        memberName: data.memberName,
        score: data.score,
        hc_at_time: data.hc_at_time,
        penalty_strokes: data.penalty_strokes,
        hc_after: data.hc_after,
        createdAt: new Date().toISOString()
      };
      const ref = await firestore.collection('scores').add(score);
      return { id: ref.id, ...score };
    },

    async getByRound(roundId) {
      const snap = await firestore.collection('scores')
        .where('roundId', '==', roundId)
        .get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  };

  const config = {
    async getPassword() {
      const doc = await firestore.collection('config').doc('app').get();
      return doc.exists ? doc.data().password : null;
    }
  };

  return { members, rounds, scores, config, PENALTY_RATE: 1 };
})();
