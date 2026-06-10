import { Router } from 'express'
import { analyze, list, getOne, remove } from '../controllers/profileController.js'

const router = Router()

router.post('/', analyze) // body: { username }
router.get('/', list) // all stored profiles
router.get('/:username', getOne) // single stored profile
router.delete('/:username', remove) // remove a stored profile

export default router
