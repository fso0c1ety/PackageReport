import path from 'path';
import { fileURLToPath } from 'url';
import Datastore from 'nedb-promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFile = path.join(__dirname, '..', 'data', 'reports.db');
const reports = Datastore.create({ filename: dbFile, autoload: true, timestampData: true });

export default {
  async list() {
    return reports.find({}).sort({ createdAt: -1 }).exec();
  },
  async get(id) {
    return reports.findOne({ id }).exec();
  },
  async insert(doc) {
    return reports.insert(doc);
  },
  async update(id, update) {
    await reports.update({ id }, { $set: update });
    return reports.findOne({ id }).exec();
  },
  async remove(id) {
    return reports.remove({ id }, { multi: false });
  },
};
