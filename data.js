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
      const teeTimes = data.teeTimes || [];
      const round = {
        date: data.date,
        course: data.course,
        address: data.address || '',
        par: data.par || 72,
        teeTimes: teeTimes,
        capacity: (teeTimes.length || 1) * 4,
        feeCart: data.feeCart || '',
        feeWalk: data.feeWalk || '',
        organizerName: data.organizerName || '',
        organizerEmail: data.organizerEmail || '',
        participants: data.participants || [],
        createdAt: new Date().toISOString()
      };
      const ref = await firestore.collection('rounds').add(round);
      return { id: ref.id, ...round };
    },

    async update(id, data) {
      const updates = { updatedAt: new Date().toISOString() };
      if (data.date !== undefined) updates.date = data.date;
      if (data.course !== undefined) updates.course = data.course;
      if (data.address !== undefined) updates.address = data.address;
      if (data.teeTimes !== undefined) {
        updates.teeTimes = data.teeTimes;
        updates.capacity = (data.teeTimes.length || 1) * 4;
      }
      if (data.feeCart !== undefined) updates.feeCart = data.feeCart;
      if (data.feeWalk !== undefined) updates.feeWalk = data.feeWalk;
      if (data.organizerName !== undefined) updates.organizerName = data.organizerName;
      if (data.organizerEmail !== undefined) updates.organizerEmail = data.organizerEmail;
      await firestore.collection('rounds').doc(id).update(updates);
      const doc = await firestore.collection('rounds').doc(id).get();
      return { id: doc.id, ...doc.data() };
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

  const rsvps = {
    async getByRound(roundId) {
      const snap = await firestore.collection('rsvps')
        .where('roundId', '==', roundId)
        .get();
      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async getJoinedByRound(roundId) {
      const all = await this.getByRound(roundId);
      return all.filter(r => r.status === 'joined');
    },

    async cancel(id) {
      await firestore.collection('rsvps').doc(id).update({
        status: 'cancelled',
        cancelledAt: new Date().toISOString()
      });
      return true;
    },

    async delete(id) {
      await firestore.collection('rsvps').doc(id).delete();
      return true;
    },

    async deleteByRound(roundId) {
      const snap = await firestore.collection('rsvps')
        .where('roundId', '==', roundId)
        .get();
      const batch = firestore.batch();
      snap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      return snap.size;
    }
  };

  const config = {
    async getPassword() {
      const doc = await firestore.collection('config').doc('app').get();
      return doc.exists ? doc.data().password : null;
    },

    async getGasUrl() {
      const doc = await firestore.collection('config').doc('app').get();
      return doc.exists ? (doc.data().gasUrl || '') : '';
    },

    async setGasUrl(url) {
      await firestore.collection('config').doc('app').set({ gasUrl: url }, { merge: true });
      return true;
    }
  };

  return { members, rounds, scores, rsvps, config, PENALTY_RATE: 1 };
})();
