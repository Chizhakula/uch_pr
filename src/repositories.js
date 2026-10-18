class Repository {
  constructor(db) { this.db = db; }
}
class UserRepository extends Repository {
  async create(u, hash) {
    return (await this.db.query(`INSERT INTO users(login,password_hash,full_name,phone,email)
      VALUES ($1,$2,$3,$4,$5) RETURNING id,login,full_name,role`,
      [u.login,hash,u.fullName,u.phone,u.email])).rows[0];
  }
  async byLogin(login) { return (await this.db.query('SELECT * FROM users WHERE login=$1',[login])).rows[0]; }
}
class BookingRepository extends Repository {
  rooms(search = '') {
    return this.db.query(`SELECT id,name,room_type,capacity,description FROM rooms
      WHERE name ILIKE $1 ORDER BY name`,[`%${search}%`]);
  }
  async room(name) { return (await this.db.query('SELECT id FROM rooms WHERE lower(name)=lower($1)',[name])).rows[0]; }
  async create(userId,roomId,startsAt,payment) {
    return (await this.db.query(`INSERT INTO bookings(user_id,room_id,starts_at,payment_method)
      VALUES ($1,$2,$3,$4) RETURNING id,status`,[userId,roomId,startsAt,payment])).rows[0];
  }
  my(userId) {
    return this.db.query(`SELECT b.id,b.starts_at,b.payment_method,b.status,b.created_at,r.name AS room_name,
      rv.id AS review_id,rv.rating,rv.comment FROM bookings b
      JOIN rooms r ON r.id=b.room_id LEFT JOIN reviews rv ON rv.booking_id=b.id
      WHERE b.user_id=$1 ORDER BY b.created_at DESC,b.id DESC`,[userId]);
  }
  all() {
    return this.db.query(`SELECT b.id,b.starts_at,b.payment_method,b.status,b.created_at,r.name AS room_name,
      u.login,u.full_name,u.phone,u.email FROM bookings b JOIN users u ON u.id=b.user_id
      JOIN rooms r ON r.id=b.room_id ORDER BY b.created_at DESC,b.id DESC`);
  }
  async changeStatus(id,status) {
    return (await this.db.query('UPDATE bookings SET status=$1 WHERE id=$2 RETURNING id,status',[status,id])).rows[0];
  }
  async addReview(userId,bookingId,rating,comment) {
    return this.db.transaction(async client => {
      const booking = (await client.query('SELECT id,status FROM bookings WHERE id=$1 AND user_id=$2 FOR UPDATE',[bookingId,userId])).rows[0];
      if (!booking) throw new Error('Заявка не найдена.');
      if (booking.status !== 'completed') throw new Error('Отзыв можно оставить после завершения мероприятия.');
      const result = await client.query('INSERT INTO reviews(booking_id,rating,comment) VALUES ($1,$2,$3) RETURNING id',[bookingId,rating,comment]);
      return result.rows[0];
    });
  }
  async stats() {
    return (await this.db.query(`SELECT count(*)::int AS total,
      count(*) FILTER (WHERE status='new')::int AS new_count,
      count(*) FILTER (WHERE status='scheduled')::int AS scheduled_count,
      count(*) FILTER (WHERE status='completed')::int AS completed_count FROM bookings`)).rows[0];
  }
}
module.exports = { UserRepository, BookingRepository };
