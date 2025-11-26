import { requireSupabaseClient } from '../config/supabase.config';

export interface Course {
  id: string;
  instructor_id: string;
  title: string;
  description?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  syllabus?: any; // JSON structure from AI generation
  is_published?: boolean; // Whether syllabus is published to students
  published_at?: string | null; // When it was published
  created_at?: string;
  updated_at?: string;
}

export interface CourseFile {
  id: string;
  course_id: string;
  file_name: string;
  file_url: string;
  blob_name: string;
  uploaded_by?: string | null;
  uploaded_at: string;
}

export interface CreateCourseDto {
  instructor_id: string;
  title: string;
  description?: string;
  file_url?: string;
  file_name?: string;
}

class CourseModel {
  private readonly table = 'courses';

  /**
   * Create a new course
   */
  async create(courseData: CreateCourseDto): Promise<Course> {
    const supabase = requireSupabaseClient();
    
    const { data, error } = await supabase
      .from(this.table)
      .insert([courseData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create course: ${error.message}`);
    }

    return data;
  }

  /**
   * Find course by ID
   */
  async findById(id: string): Promise<Course | null> {
    const supabase = requireSupabaseClient();
    
    const { data, error } = await supabase
      .from(this.table)
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  /**
   * Get all courses (optionally filtered by instructor)
   * @param instructorId - If provided, only return courses for this instructor
   * @param publishedOnly - If true, only return published courses (default: false for instructor, true for students)
   */
  async findAll(instructorId?: string, publishedOnly: boolean = false): Promise<Course[]> {
    const supabase = requireSupabaseClient();
    
    let query = supabase.from(this.table).select('*');
    
    if (instructorId) {
      query = query.eq('instructor_id', instructorId);
    }
    
    if (publishedOnly) {
      query = query.eq('is_published', true);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data;
  }

  /**
   * Get courses enrolled by a student
   */
  async findByStudent(studentId: string): Promise<Course[]> {
    const supabase = requireSupabaseClient();
    
    const { data, error } = await supabase
      .from('enrollments')
      .select('course_id, courses(*)')
      .eq('student_id', studentId);

    if (error || !data) {
      return [];
    }

    return data.map((enrollment: any) => enrollment.courses);
  }

  /**
   * Update course
   */
  async update(id: string, updates: Partial<Course>): Promise<Course> {
    const supabase = requireSupabaseClient();
    
    // First check if course exists
    const { data: existingCourse } = await supabase
      .from(this.table)
      .select('*')
      .eq('id', id)
      .single();

    if (!existingCourse) {
      throw new Error(`Course with id ${id} not found`);
    }

    // Perform update
    const { data, error } = await supabase
      .from(this.table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      throw new Error(`Failed to update course: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned from update');
    }

    return data;
  }

  /**
   * Publish course syllabus (make visible to students)
   */
  async publish(id: string): Promise<Course> {
    return this.update(id, {
      is_published: true,
      published_at: new Date().toISOString()
    });
  }

  /**
   * Unpublish course syllabus (hide from students)
   */
  async unpublish(id: string): Promise<Course> {
    return this.update(id, {
      is_published: false
    });
  }

  /**
   * Delete course
   */
  async delete(id: string): Promise<boolean> {
    const supabase = requireSupabaseClient();
    
    const { error } = await supabase
      .from(this.table)
      .delete()
      .eq('id', id);

    return !error;
  }

  /**
   * Enroll a student in a course
   */
  async enrollStudent(studentId: string, courseId: string): Promise<void> {
    const supabase = requireSupabaseClient();
    
    const { error } = await supabase
      .from('enrollments')
      .insert([{ student_id: studentId, course_id: courseId }]);

    if (error) {
      console.error('Failed to enroll student:', error);
      throw new Error(`Failed to enroll student: ${error.message}`);
    }
  }

  /**
   * Unenroll a student from a course
   */
  async unenrollStudent(studentId: string, courseId: string): Promise<void> {
    const supabase = requireSupabaseClient();
    
    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('student_id', studentId)
      .eq('course_id', courseId);

    if (error) {
      console.error('Failed to unenroll student:', error);
      throw new Error(`Failed to unenroll student: ${error.message}`);
    }
  }

  /**
   * Check if student is enrolled in course
   */
  async isEnrolled(studentId: string, courseId: string): Promise<boolean> {
    const supabase = requireSupabaseClient();
    
    const { data, error } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .single();

    return !error && !!data;
  }

  /**
   * Add a course file record
   */
  async addCourseFile(params: {
    course_id: string;
    file_name: string;
    file_url: string;
    blob_name: string;
    uploaded_by?: string;
  }): Promise<CourseFile> {
    const supabase = requireSupabaseClient();

    const { data, error } = await supabase
      .from('course_files')
      .insert([params])
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to add course file: ${error?.message}`);
    }

    return data;
  }

  /**
   * Get files for a course
   */
  async getCourseFiles(courseId: string): Promise<CourseFile[]> {
    const supabase = requireSupabaseClient();

    const { data, error } = await supabase
      .from('course_files')
      .select('*')
      .eq('course_id', courseId)
      .order('uploaded_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data;
  }

  /**
   * Get file by ID
   */
  async getCourseFileById(courseId: string, fileId: string): Promise<CourseFile | null> {
    const supabase = requireSupabaseClient();

    const { data, error } = await supabase
      .from('course_files')
      .select('*')
      .eq('course_id', courseId)
      .eq('id', fileId)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  /**
   * Delete file record
   */
  async deleteCourseFile(fileId: string): Promise<void> {
    const supabase = requireSupabaseClient();

    const { error } = await supabase
      .from('course_files')
      .delete()
      .eq('id', fileId);

    if (error) {
      throw new Error(`Failed to delete course file: ${error.message}`);
    }
  }

  /**
   * Get latest file for a course
   */
  async getLatestCourseFile(courseId: string): Promise<CourseFile | null> {
    const supabase = requireSupabaseClient();

    const { data, error } = await supabase
      .from('course_files')
      .select('*')
      .eq('course_id', courseId)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data;
  }
}

export default new CourseModel();

