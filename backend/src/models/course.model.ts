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
   */
  async findAll(instructorId?: string): Promise<Course[]> {
    const supabase = requireSupabaseClient();
    
    let query = supabase.from(this.table).select('*');
    
    if (instructorId) {
      query = query.eq('instructor_id', instructorId);
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
  async enrollStudent(studentId: string, courseId: string): Promise<boolean> {
    const supabase = requireSupabaseClient();
    
    const { error } = await supabase
      .from('enrollments')
      .insert([{ student_id: studentId, course_id: courseId }]);

    return !error;
  }

  /**
   * Unenroll a student from a course
   */
  async unenrollStudent(studentId: string, courseId: string): Promise<boolean> {
    const supabase = requireSupabaseClient();
    
    const { error } = await supabase
      .from('enrollments')
      .delete()
      .eq('student_id', studentId)
      .eq('course_id', courseId);

    return !error;
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
}

export default new CourseModel();

