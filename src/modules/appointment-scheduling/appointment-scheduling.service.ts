import { MailerService } from '@nestjs-modules/mailer';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { addDays } from 'date-and-time';
import { ObjectId } from 'mongodb';
import { Collection, Connection } from 'mongoose';
import { getKeyOfDay, Role, SCHEDULE_STATUS, ScheduleDay, SessionSchedule } from '../../constants';
import { RegistrationDto } from './dto';

@Injectable()
export class AppointmentSchedulingService {
  private readonly scheduleCollection: Collection;
  private readonly notificationCollection: Collection;
  private readonly userCollection: Collection;

  constructor(@InjectConnection() private connection: Connection, private readonly mailerService: MailerService) {
    this.userCollection = this.connection.collection('users');
    this.scheduleCollection = this.connection.collection('appointment-scheduling');
    this.notificationCollection = this.connection.collection('notifications');
  }

  async registration(input: RegistrationDto) {
    const { doctorId, userId, date, name, note, phone, service, session, from, to, room } = input;

    const regisExisted = await this.scheduleCollection.findOne({
      $or: [
        { doctorId: new ObjectId(doctorId), date: new Date(date), session, from, to },
        { phone, date: date ? new Date(date) : null, session, from, to }
      ]
    });

    // validate duplicate
    if (regisExisted)
      throw new BadRequestException({ message: 'Lịch khám đã được đặt bởi bạn trước đó', data: regisExisted });

    // check the schedule created
    const doctors = await this.userCollection
      .find<any>({ role: Role.DOCTOR, timeServing: { $ne: null } })
      .project({ timeServing: 1, email: 1, fullName: 1 })
      .toArray();

    if (doctors.some((d) => d?.timeServing != null && Object.keys(d?.timeServing)?.length)) {
    } else throw new BadRequestException({ message: 'Không tìm thấy thời gian phù hợp' });

    const now = new Date();
    const toDay = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    let newSession = session;
    let _date = date ? new Date(date) : null;
    let _day = _date ? new Date(_date).getDay() : null;

    // get doctors work on day
    const getDoctorsOnDays = (day?: ScheduleDay, session?: SessionSchedule) => {
      const doctorsOnTime = doctors.filter((d) => {
        const timeServings = d?.timeServing?.[getKeyOfDay(day)];
        const sessions = timeServings?.filter((s) => {
          return s.from < (session == SessionSchedule.MORNING) ? 11 : 17;
        });
        return sessions && sessions != 0;
      });
      return doctorsOnTime;
    };

    // if day selected
    if (_day) {
      const doctorsOnTime = getDoctorsOnDays(_day, session);
      if (!doctorsOnTime.length) throw new BadRequestException({ message: 'Không tìm thấy thời gian phù hợp' });
    }

    // if sesstion selected
    if (session == 0) {
      const countMORNING = await this.scheduleCollection.findOne({
        date: new Date(date),
        session: SessionSchedule.MORNING
      });

      const countPM = await this.scheduleCollection.findOne({
        date: new Date(date),
        session: SessionSchedule.AFTERNOON
      });

      newSession = countMORNING < countPM ? SessionSchedule.MORNING : SessionSchedule.AFTERNOON;
    }

    // get date valid
    let newDate = _date !== null ? _date : addDays(toDay, 1);
    let newDay = _day !== null ? _day : addDays(toDay, 1).getDay();
    let newDoctors: any[] = [];
    for (let i = newDay; i <= ScheduleDay.sat; i++) {
      const doctorsOnTime = getDoctorsOnDays(i, newSession);
      if (doctorsOnTime.length) {
        newDay = i;
        newDate = addDays(newDate, i - newDay);
        newDoctors = doctorsOnTime;
        break;
      }
    }
    // next week
    if (!newDoctors.length) {
      for (let i = ScheduleDay.mon; i <= ScheduleDay.sat; i++) {
        const doctorsOnTime = getDoctorsOnDays(i, newSession);
        if (doctorsOnTime.length) {
          newDay = i;
          newDate = addDays(toDay, ScheduleDay.sat - toDay.getDay() + 1 + i);
          newDoctors = doctorsOnTime;
          break;
        }
      }
    }

    // check duplicate with record created before
    const existed = await this.scheduleCollection.findOne<any>({ date: newDate });
    if (existed) throw new BadRequestException({ message: 'Lịch khám đã được đặt bởi bạn trước đó', data: existed });
    
    // No doctor
    if (!newDoctors.length)
      throw new BadRequestException({
        message: 'Không tìm thấy thời gian phù hợp hoặc không có bác sĩ nào làm việc vào thời gian này!'
      });

    const doctorIds = newDoctors.map((d) => d._id);
    const countSchedules = await this.scheduleCollection
      .aggregate<any>([
        { $match: { doctorId: { $in: doctorIds }, date: newDate } },
        { $group: { _id: '$doctorId', count: { $sum: 1 } } }
      ])
      .toArray();

    const combinaScheduleCount = doctorIds.map((id) => {
      const item = countSchedules.find((i) => i._id.toString() == id.toString());
      if (item) return item;
      return {
        _id: id,
        count: 0
      };
    });

    const doctorHasLeastSchedule = combinaScheduleCount.reduce(function (prev, curr) {
      return prev.count < curr.count ? prev : curr;
    });

    const doctor = await this.userCollection.findOne({ _id: doctorHasLeastSchedule._id }, { projection: { timeServing: 1 } });
    const timeServing = doctor?.timeServing?.[getKeyOfDay(newDay)];

    const countTimeServing = await this.scheduleCollection
      .aggregate<any>([
        { $match: { doctorId: doctorHasLeastSchedule._id, date: newDate } },
        { $group: { _id: '$from', count: { $sum: 1 } } }
      ])
      .toArray();

    const combineTimeServing = timeServing.map((i) => {
      const _its = countTimeServing.find((v) => v._id === i.from);
      if (_its) return { ...i, count: _its.count };
      return { ...i, count: 0 };
    });
    
    const _min = combineTimeServing.reduce(function (prev, curr) {
      return prev.count < curr.count ? prev : curr;
    });

    const record = await this.scheduleCollection.insertOne({
      userId: userId ? new ObjectId(userId) : null,
      doctorId: doctor ? new ObjectId(doctor?._id) : null,
      date: newDate,
      session: newSession,
      status: SCHEDULE_STATUS.PROGRESS,
      createdAt: new Date(),
      from: from ?? _min.from,
      to: to ?? _min.to,
      room: room ?? _min.room,
      name,
      service,
      phone,
      note
    });

    const data = await this.getAppointmentScheduling(record.insertedId.toString());
    return {
      message: 'Đặt lịch thành công',
      id: record.insertedId,
      data
    };
  }

  getAppointmentScheduling = async (id: string) => {
    const data = await this.scheduleCollection.findOne({
      _id: new ObjectId(id)
    });

    const doctor = await this.userCollection.findOne<any>(
      { _id: new ObjectId(data.doctorId) },
      { projection: { email: 1, fullName: 1 } }
    );

    const user = await this.userCollection.findOne<any>(
      { _id: new ObjectId(data.userId) },
      { projection: { email: 1, fullName: 1 } }
    );

    return {
      ...data,
      doctor,
      user
    };
  };
}
